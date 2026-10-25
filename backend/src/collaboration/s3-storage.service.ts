import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class S3StorageService {
  private readonly client: S3Client;
  private readonly presignerClient: S3Client;
  private readonly bucket: string | undefined;

  constructor(config: ConfigService) {
    const accessKeyId = config.get<string>('S3_ACCESS_KEY');
    const secretAccessKey = config.get<string>('S3_SECRET_KEY');
    if (Boolean(accessKeyId) !== Boolean(secretAccessKey)) {
      throw new InternalServerErrorException(
        'S3_ACCESS_KEY and S3_SECRET_KEY must be configured together.',
      );
    }
    const region =
      config.get<string>('S3_REGION') ?? config.get<string>('AWS_REGION');
    if (!region) {
      throw new InternalServerErrorException('S3_REGION must be configured.');
    }
    const forcePathStyle = config.get<string>('S3_FORCE_PATH_STYLE');
    if (
      forcePathStyle !== undefined &&
      !['true', 'false'].includes(forcePathStyle)
    ) {
      throw new InternalServerErrorException(
        'S3_FORCE_PATH_STYLE must be true or false.',
      );
    }

    this.bucket = config.get<string>('S3_BUCKET');
    const endpoint = config.get<string>('S3_ENDPOINT') || undefined;
    const publicEndpoint =
      config.get<string>('S3_PUBLIC_ENDPOINT') || endpoint;
    const credentials =
      accessKeyId && secretAccessKey
        ? { accessKeyId, secretAccessKey }
        : undefined;
    const clientConfig = {
      region,
      forcePathStyle: forcePathStyle === 'true',
      credentials,
      requestChecksumCalculation: 'WHEN_REQUIRED' as const,
    };
    this.client = new S3Client({
      ...clientConfig,
      endpoint,
    });
    this.presignerClient = new S3Client({
      ...clientConfig,
      endpoint: publicEndpoint,
    });
  }

  async createUploadUrl(
    objectKey: string,
    contentType: string,
    contentLength: number,
  ): Promise<string> {
    return getSignedUrl(
      this.presignerClient,
      new PutObjectCommand({
        Bucket: this.requireBucket(),
        Key: objectKey,
        ContentType: contentType,
        ContentLength: contentLength,
      }),
      {
        expiresIn: 300,
        signableHeaders: new Set(['content-type']),
      },
    );
  }

  assertConfigured(): void {
    this.requireBucket();
  }

  async createDownloadUrl(
    objectKey: string,
    fileName: string,
  ): Promise<string> {
    const safeFileName = fileName.replace(/[\r\n"]/g, '_');
    return getSignedUrl(
      this.presignerClient,
      new GetObjectCommand({
        Bucket: this.requireBucket(),
        Key: objectKey,
        ResponseContentDisposition: `attachment; filename="${safeFileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      }),
      { expiresIn: 300 },
    );
  }

  async inspectObject(objectKey: string): Promise<{
    contentLength: number | undefined;
    contentType: string | undefined;
  }> {
    try {
      const result = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.requireBucket(),
          Key: objectKey,
        }),
      );
      return {
        contentLength: result.ContentLength,
        contentType: result.ContentType,
      };
    } catch (error) {
      if (
        error instanceof S3ServiceException &&
        error.$metadata.httpStatusCode === 404
      ) {
        throw new ConflictException(
          'Upload the object to S3 before completing the attachment.',
        );
      }
      throw error;
    }
  }

  async deleteObject(objectKey: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.requireBucket(),
        Key: objectKey,
      }),
    );
  }

  private requireBucket(): string {
    if (!this.bucket) {
      throw new InternalServerErrorException('S3_BUCKET must be configured.');
    }
    return this.bucket;
  }
}
