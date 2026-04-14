import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointRecord } from './point-record.entity';
import { PointService } from './point.service';
import { PointController } from './point.controller';
import { User } from '../user/user.entity';
import { Indicator } from '../indicator/indicator.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PointRecord, User, Indicator])],
  controllers: [PointController],
  providers: [PointService],
  exports: [PointService],
})
export class PointModule {}
