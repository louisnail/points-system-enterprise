import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuarterStarController } from './quarter-star.controller';
import { QuarterStarService } from './quarter-star.service';
import { QuarterStar } from './quarter-star.entity';
import { User } from '../user/user.entity';
import { RankingList } from '../ranking-list/ranking-list.entity';
import { RankingModule } from '../ranking/ranking.module';

@Module({
  imports: [TypeOrmModule.forFeature([QuarterStar, User, RankingList]), RankingModule],
  controllers: [QuarterStarController],
  providers: [QuarterStarService],
  exports: [QuarterStarService],
})
export class QuarterStarModule {}
