import { S3Client } from '@aws-sdk/client-s3';

export function createS3Client() {
  return new S3Client({
    region: process.env.AWS_REGION,
  });
}

export function getBucketConfig() {
  return {
    bucketName: process.env.AWS_BUCKET_NAME as string,
    folderPrefix: process.env.AWS_FOLDER_PREFIX || '',
  };
}
