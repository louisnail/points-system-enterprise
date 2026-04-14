import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProcessPointHistory } from './process-point-history.entity';
import { PointRecord } from '../point/point-record.entity';
import { User } from '../user/user.entity';
import { Indicator } from '../indicator/indicator.entity';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';

@Injectable()
export class ProcessPointService {
  constructor(
    @InjectRepository(ProcessPointHistory)
    private readonly repo: Repository<ProcessPointHistory>,
    @InjectRepository(PointRecord)
    private readonly pointRepo: Repository<PointRecord>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Indicator)
    private readonly indicatorRepo: Repository<Indicator>,
  ) {}

  async findByMonth(belongMonth: string, userId?: number) {
    const qb = this.repo.createQueryBuilder('pp')
      .leftJoinAndSelect('pp.user', 'u')
      .leftJoinAndSelect('pp.indicator', 'ind')
      .where('pp.belong_month = :belongMonth', { belongMonth });

    if (userId) qb.andWhere('pp.user_id = :userId', { userId });
    return qb.orderBy('pp.user_id', 'ASC').addOrderBy('pp.indicator_id', 'ASC').getMany();
  }

  async getHistory(userId: number, indicatorId: number) {
    return this.repo.find({
      where: { userId, indicatorId },
      order: { belongMonth: 'DESC' },
      take: 12,
    });
  }

  /**
   * Upsert process point: if same user+indicator+month exists, archive old and update
   */
  async upsert(dto: {
    userId: number;
    indicatorId: number;
    score: number;
    belongMonth: string;
    registrantId: number;
    description?: string;
  }) {
    const indicator = await this.indicatorRepo.findOne({ where: { id: dto.indicatorId } });
    if (!indicator) throw new BadRequestException('指标不存在');
    if (indicator.pointStatus !== 1) throw new BadRequestException('该指标非过程分类型');

    const user = await this.userRepo.findOne({ where: { id: dto.userId } });
    if (!user) throw new BadRequestException('员工不存在');

    // Create point record (with auto-pass audit for process points)
    const pointRecord = await this.pointRepo.save(this.pointRepo.create({
      userId: dto.userId,
      indicatorId: dto.indicatorId,
      score: dto.score * indicator.direction,
      description: dto.description,
      recordType: 1,
      pointStatus: 1,
      belongMonth: dto.belongMonth,
      registrantId: dto.registrantId,
      registeredAt: new Date(),
      auditStatus: 1, // Process points auto-approved
      auditorId: dto.registrantId,
      auditedAt: new Date(),
    }));

    // Check existing process point history for this user+indicator+month
    const existing = await this.repo.findOne({
      where: { userId: dto.userId, indicatorId: dto.indicatorId, belongMonth: dto.belongMonth },
    });

    if (existing) {
      // Update: adjust user total points (remove old, add new)
      const scoreDiff = (dto.score * indicator.direction) - existing.score;
      existing.score = dto.score * indicator.direction;
      existing.recordId = pointRecord.id;
      await this.repo.save(existing);

      if (scoreDiff !== 0) {
        await this.userRepo
          .createQueryBuilder()
          .update(User)
          .set({ totalPoints: () => 'total_points + :diffVal' })
          .setParameter('diffVal', Number(scoreDiff))
          .where('id = :id', { id: dto.userId })
          .execute();
      }
    } else {
      // New: create history entry and add to user total
      await this.repo.save(this.repo.create({
        userId: dto.userId,
        indicatorId: dto.indicatorId,
        score: dto.score * indicator.direction,
        belongMonth: dto.belongMonth,
        recordId: pointRecord.id,
      }));

      await this.userRepo
        .createQueryBuilder()
        .update(User)
        .set({ totalPoints: () => 'total_points + :addVal' })
        .setParameter('addVal', Number(dto.score * indicator.direction))
        .where('id = :id', { id: dto.userId })
        .execute();
    }

    return pointRecord;
  }

  async importFromExcel(buffer: Buffer, registrantId: number, belongMonth: string) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new BadRequestException('Excel文件为空');

    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const employeeNo = row.getCell(1).text?.trim();
      const indicatorId = parseInt(row.getCell(2).text?.trim());
      const score = parseFloat(row.getCell(3).text?.trim());
      const description = row.getCell(4).text?.trim();

      if (!employeeNo || !indicatorId || isNaN(score)) {
        results.errors.push(`第${i}行: 工号、指标ID和分值为必填`);
        results.failed++;
        continue;
      }

      try {
        const user = await this.userRepo.findOne({ where: { employeeNo } });
        if (!user) {
          results.errors.push(`第${i}行: 工号 ${employeeNo} 不存在`);
          results.failed++;
          continue;
        }

        await this.upsert({ userId: user.id, indicatorId, score, belongMonth, registrantId, description });
        results.success++;
      } catch (err: any) {
        results.errors.push(`第${i}行: ${err.message}`);
        results.failed++;
      }
    }
    return results;
  }

  async getTemplate(res: Response) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('过程分导入模板');
    sheet.columns = [
      { header: '工号*', key: 'employeeNo', width: 15 },
      { header: '指标ID*', key: 'indicatorId', width: 12 },
      { header: '分值*', key: 'score', width: 10 },
      { header: '说明', key: 'description', width: 30 },
    ];
    sheet.addRow({ employeeNo: '001001', indicatorId: 1, score: 10, description: '正偏离5%' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=process_point_template.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  }
}
