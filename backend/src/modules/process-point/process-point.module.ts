import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessPointHistory } from './process-point-history.entity';
import { ProcessPointService } from './process-point.service';
import { ProcessPointController } from './process-point.controller';
import { PointRecord } from '../point/point-record.entity';
import { User } from '../user/user.entity';
import { Indicator } from '../indicator/indicator.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProcessPointHistory, PointRecord, User, Indicator])],
  controllers: [ProcessPointController],
  providers: [ProcessPointService],
  exports: [ProcessPointService],
})
export class ProcessPointModule {}
