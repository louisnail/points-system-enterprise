import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IndicatorController } from './indicator.controller';
import { IndicatorCategoryController } from './indicator-category.controller';
import { IndicatorService } from './indicator.service';
import { IndicatorCategoryService } from './indicator-category.service';
import { Indicator } from './indicator.entity';
import { IndicatorCategory } from './indicator-category.entity';
import { ScoreProfileDimension } from '../score-profile/score-profile-dimension.entity';
import { RankingList } from '../ranking-list/ranking-list.entity';
import { PointRecord } from '../point/point-record.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Indicator, IndicatorCategory, ScoreProfileDimension, RankingList, PointRecord])],
  controllers: [IndicatorController, IndicatorCategoryController],
  providers: [IndicatorService, IndicatorCategoryService],
  exports: [IndicatorService, IndicatorCategoryService],
})
export class IndicatorModule {}
