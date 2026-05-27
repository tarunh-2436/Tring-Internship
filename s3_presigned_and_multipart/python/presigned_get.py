import boto3,dotenv,os,requests

dotenv.load_dotenv()

s3_client = boto3.client(
  's3',
  aws_access_key_id = os.getenv('AWS_ACCESS_KEY_ID'),
  aws_secret_access_key = os.getenv('AWS_SECRET_ACCESS_KEY')
)

url = s3_client.generate_presigned_url(
  'get_object',
  Params = {
    'Bucket': os.getenv('BUCKET_NAME'),
    'Key': 'test_file.txt'
  }
)

print(url)

response = requests.get(url)
print(response)
f = open('downloaded_test.txt','wb')
f.write(response.content)
f.close()
