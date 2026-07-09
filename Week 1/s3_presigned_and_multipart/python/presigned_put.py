import boto3,dotenv,os,requests,mimetypes

dotenv.load_dotenv()

file_path = '..\\uploads\\test.txt'
content_type,_ = mimetypes.guess_type(file_path)

s3_client = boto3.client(
  's3',
  aws_access_key_id = os.getenv('AWS_ACCESS_KEY_ID'),
  aws_secret_access_key = os.getenv('AWS_SECRET_ACCESS_KEY')
)

url = s3_client.generate_presigned_url(
  'put_object',
  Params={
    'Bucket': os.getenv('BUCKET_NAME'),
    'Key': 'test_file.txt',
    'ContentType': content_type
  },
  ExpiresIn=60
)

print(url)

data = open(file_path,'rb')
response = requests.put(
  url, 
  data=data,
  headers={
    'Content-Type': content_type}
  )
print(response)