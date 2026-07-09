import boto3,dotenv,os

dotenv.load_dotenv()

s3 = boto3.client(
    "s3",
    aws_access_key_id = os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key = os.getenv("AWS_SECRET_ACCESS_KEY")
    )

bucket_name = os.getenv("BUCKET_NAME")
key = "test_part_upload.mp4"
file_path = "..\\uploads\\Drone Testing Video.MP4"

CHUNK_SIZE = 100 * 1024 * 1024  # 100 MB

# Step 1 — Initiate Multipart Upload
response = s3.create_multipart_upload(
    Bucket=bucket_name,
    Key=key
)

upload_id = response["UploadId"]

print(f"Upload ID: {upload_id}")

parts = []

# Step 2 — Read File in Chunks
with open(file_path, "rb") as f:

    part_number = 1

    while True:

        data = f.read(CHUNK_SIZE)

        if not data:
            break

        print(f"Uploading part {part_number}")

        response = s3.upload_part(
            Bucket=bucket_name,
            Key=key,
            PartNumber=part_number,
            UploadId=upload_id,
            Body=data
        )

        parts.append({
            "ETag": response["ETag"],
            "PartNumber": part_number
        })

        part_number += 1

# Step 3 — Complete Multipart Upload
s3.complete_multipart_upload(
    Bucket=bucket_name,
    Key=key,
    UploadId=upload_id,
    MultipartUpload={
        "Parts": parts
    }
)

print("Upload completed!")