import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RankingListController } from './ranking-list.controller';
import { RankingListService } from './ranking-list.service';
import { RankingList } from './ranking-list.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RankingList])],
  controllers: [RankingListController],
  providers: [RankingListService],
  exports: [RankingListService],
})
export class RankingListModule {}
