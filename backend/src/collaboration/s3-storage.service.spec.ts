import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { S3StorageService } from './s3-storage.service';

describe('S3StorageService', () => {
  const values: Record<string, string> = {
    S3_ACCESS_KEY: 'local-access-key',
    S3_SECRET_KEY: 'local-secret-key',
    S3_BUCKET: 'taskflow-test',
    S3_REGION: 'us-east-1',
    S3_ENDPOINT: 'http://seaweedfs:8333',
    S3_PUBLIC_ENDPOINT: 'http://localhost:8333',
    S3_FORCE_PATH_STYLE: 'true',
  };

  function configService(): Pick<ConfigService, 'get'> {
    return {
      get: jest.fn((key: string) => values[key]),
    };
  }

  it('signs an upload for the browser-facing endpoint and caps its expiry at five minutes', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        S3StorageService,
        { provide: ConfigService, useValue: configService() },
      ],
    }).compile();
    const storage = moduleRef.get(S3StorageService);

    const url = await storage.createUploadUrl(
      'project/task/file',
      'application/pdf',
      512,
    );
    const parsed = new URL(url);

    expect(parsed.origin).toBe('http://localhost:8333');
    expect(parsed.pathname).toBe('/taskflow-test/project/task/file');
    expect(parsed.searchParams.get('X-Amz-Expires')).toBe('300');
    expect(parsed.searchParams.get('X-Amz-SignedHeaders')).toContain(
      'content-type',
    );
    await moduleRef.close();
  });

  it('rejects a partial static credential configuration', async () => {
    const partialConfig = {
      get: jest.fn((key: string) =>
        key === 'S3_ACCESS_KEY' ? 'only-one-key' : undefined,
      ),
    };
    await expect(
      Test.createTestingModule({
        providers: [
          S3StorageService,
          { provide: ConfigService, useValue: partialConfig },
        ],
      }).compile(),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
