import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from './user.entity';
import { Department } from '../department/department.entity';
import { RankingList } from '../ranking-list/ranking-list.entity';
import { PointRecord } from '../point/point-record.entity';
import { ProcessPointHistory } from '../process-point/process-point-history.entity';
import { QuarterStar } from '../quarter-star/quarter-star.entity';
import { SystemModule } from '../system/system.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Department, RankingList, PointRecord, ProcessPointHistory, QuarterStar]),
    SystemModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
