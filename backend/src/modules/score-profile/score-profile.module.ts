import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScoreProfileController } from './score-profile.controller';
import { ScoreProfileService } from './score-profile.service';
import { ScoreProfileTemplate } from './score-profile-template.entity';
import { ScoreProfileDimension } from './score-profile-dimension.entity';
import { User } from '../user/user.entity';
import { PointRecord } from '../point/point-record.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ScoreProfileTemplate,
      ScoreProfileDimension,
      User,
      PointRecord,
    ]),
  ],
  controllers: [ScoreProfileController],
  providers: [ScoreProfileService],
  exports: [ScoreProfileService],
})
export class ScoreProfileModule {}
