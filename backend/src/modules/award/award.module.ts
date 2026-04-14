import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Award } from './award.entity';
import { User } from '../user/user.entity';
import { Department } from '../department/department.entity';
import { AwardController } from './award.controller';
import { AwardService } from './award.service';

@Module({
  imports: [TypeOrmModule.forFeature([Award, User, Department])],
  controllers: [AwardController],
  providers: [AwardService],
  exports: [AwardService],
})
export class AwardModule {}
