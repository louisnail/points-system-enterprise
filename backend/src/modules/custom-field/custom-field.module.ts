import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomFieldDefinition } from './custom-field.entity';
import { CustomFieldController } from './custom-field.controller';
import { CustomFieldService } from './custom-field.service';

@Module({
  imports: [TypeOrmModule.forFeature([CustomFieldDefinition])],
  controllers: [CustomFieldController],
  providers: [CustomFieldService],
  exports: [CustomFieldService],
})
export class CustomFieldModule {}
