import { Module } from '@nestjs/common';
import { DATABASE_PROBE } from './database-probe';
import { PrismaService } from './prisma.service';

@Module({
  providers: [
    PrismaService,
    { provide: DATABASE_PROBE, useExisting: PrismaService },
  ],
  exports: [PrismaService, DATABASE_PROBE],
})
export class PrismaModule {}
