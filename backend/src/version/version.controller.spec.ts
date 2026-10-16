import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { VersionController } from './version.controller';

describe('VersionController', () => {
  let controller: VersionController;
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    configService = { get: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      controllers: [VersionController],
      providers: [{ provide: ConfigService, useValue: configService }],
    }).compile();

    controller = moduleRef.get(VersionController);
  });

  it('returns build metadata from configuration', () => {
    configService.get.mockImplementation((key: string) =>
      key === 'GIT_SHA' ? 'abc1234' : '2026-10-16T02:00:00Z',
    );

    expect(controller.getVersion()).toEqual({
      gitSha: 'abc1234',
      buildTime: '2026-10-16T02:00:00Z',
    });
  });

  it('uses unknown when build metadata is unavailable', () => {
    configService.get.mockReturnValue(undefined);

    expect(controller.getVersion()).toEqual({
      gitSha: 'unknown',
      buildTime: 'unknown',
    });
  });
});
