import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { DepartmentModule } from './modules/department/department.module';
import { RankingListModule } from './modules/ranking-list/ranking-list.module';
import { IndicatorModule } from './modules/indicator/indicator.module';
import { SystemModule } from './modules/system/system.module';
import { PointModule } from './modules/point/point.module';
import { ProcessPointModule } from './modules/process-point/process-point.module';
import { RankingModule } from './modules/ranking/ranking.module';
import { QuarterStarModule } from './modules/quarter-star/quarter-star.module';
import { CustomFieldModule } from './modules/custom-field/custom-field.module';
import { ScoreProfileModule } from './modules/score-profile/score-profile.module';
import { AwardModule } from './modules/award/award.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 3306),
        username: config.get('DB_USERNAME', 'root'),
        password: config.get('DB_PASSWORD', 'root123'),
        database: config.get('DB_DATABASE', 'points_enterprise'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
        charset: 'utf8mb4',
        logging: process.env.NODE_ENV !== 'production',
      }),
    }),
    AuthModule,
    UserModule,
    DepartmentModule,
    RankingListModule,
    IndicatorModule,
    SystemModule,
    PointModule,
    ProcessPointModule,
    RankingModule,
    QuarterStarModule,
    CustomFieldModule,
    ScoreProfileModule,
    AwardModule,
  ],
})
export class AppModule {}
