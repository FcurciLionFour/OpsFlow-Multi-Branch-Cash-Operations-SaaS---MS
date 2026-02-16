import { Module } from '@nestjs/common';
import { CashMovementsController } from './cash-movements.controller';
import { CashMovementsService } from './cash-movements.service';
import { CashflowController } from './cashflow.controller';
import { CashflowStatsService } from './cashflow-stats.service';

@Module({
  controllers: [CashMovementsController, CashflowController],
  providers: [CashMovementsService, CashflowStatsService],
  exports: [CashMovementsService, CashflowStatsService],
})
export class CashflowModule {}
