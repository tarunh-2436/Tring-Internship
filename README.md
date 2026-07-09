# AWS Serverless Feedback API

A fully serverless feedback management application built on AWS using **Terraform Infrastructure as Code (IaC)**. The project demonstrates how AWS Lambda and Amazon API Gateway can be combined to build scalable REST APIs without provisioning or managing servers.

The application provides a lightweight web interface where users can submit feedback and retrieve previously submitted feedback. Feedback is stored as JSON documents in Amazon S3, while the frontend is hosted as a static website and delivered through Amazon CloudFront.

Unlike traditional web applications that require dedicated backend servers, all business logic executes on demand inside AWS Lambda, enabling automatic scaling and reduced operational overhead.

---

# Technology Stack

## Frontend

* HTML5
* CSS3
* Vanilla JavaScript

Responsibilities:

* Feedback submission
* Feedback retrieval
* Client-side validation
* REST API communication

---

## Backend

* Python 3
* AWS Lambda
* boto3

Responsibilities:

* Handle API requests
* Validate user input
* Store feedback
* Retrieve feedback
* Generate JSON responses

---

## API Layer

* Amazon API Gateway (HTTP API)

Responsibilities:

* Route HTTP requests
* Invoke Lambda
* Return API responses

---

## Storage

* Amazon S3

Used for:

* Static website hosting
* Feedback data storage

---

## Authentication

* Amazon Cognito

Used for:

* JWT authentication
* Role-based response handling
* Administrator identification

---

## Infrastructure

Terraform provisions:

* AWS Lambda
* Amazon API Gateway
* Amazon S3
* Amazon CloudFront
* Amazon Cognito
* IAM Roles and Policies
* CloudWatch Logging

---

# Overall Architecture

```
                Browser
                   │
                   ▼
          Amazon CloudFront
                   │
                   ▼
          Static Website (S3)
                   │
                   ▼
        Amazon API Gateway
                   │
                   ▼
             AWS Lambda
            ┌─────────────┐
            │             │
            ▼             ▼
       Amazon S3     CloudWatch
     (Feedback Data)    Logs
```

The application follows a simple serverless architecture where frontend assets are delivered through CloudFront, API requests are handled by API Gateway, Lambda contains the application logic, and Amazon S3 stores submitted feedback.

---

# Application Features

## Submit Feedback

Users can submit feedback through a simple web interface.

Each submission includes:

* Name
* Feedback message
* Automatically generated timestamp

Every submission is stored as an individual JSON document inside Amazon S3.

---

## Retrieve Feedback

The application retrieves every stored feedback object from Amazon S3 and returns the collection sorted by submission time.

Role-aware behavior is implemented:

### Administrator

Administrators receive:

* Name
* Feedback
* Timestamp

### Regular Users

Regular authenticated users receive:

* Anonymous name
* Feedback
* Timestamp

This demonstrates simple authorization logic using Cognito JWT claims without exposing personally identifiable information.

---

# REST API

## Submit Feedback

**POST /feedback**

Request

```json
{
  "name": "John Doe",
  "feedback": "Great application!"
}
```

Response

```json
{
  "message": "Object stored successfully in S3"
}
```

---

## Retrieve Feedback

**GET /feedback**

Returns all stored feedback ordered by newest first.

Administrator response:

```json
[
  {
    "name": "John Doe",
    "feedback": "Great application!",
    "timestamp": "2026-06-15T10:30:00Z"
  }
]
```

Regular user response:

```json
[
  {
    "name": "Anonymous",
    "feedback": "Great application!",
    "timestamp": "2026-06-15T10:30:00Z"
  }
]
```

---

# Request Lifecycle

### Feedback Submission

```
User
 │
 ▼
POST /feedback
 │
 ▼
API Gateway
 │
 ▼
Lambda
 │
 ▼
Validate Request
 │
 ▼
Generate UUID
 │
 ▼
Store JSON in S3
 │
 ▼
Return HTTP Response
```

---

### Feedback Retrieval

```
User
 │
 ▼
GET /feedback
 │
 ▼
API Gateway
 │
 ▼
Lambda
 │
 ▼
Read JWT Claims
 │
 ▼
Determine User Role
 │
 ▼
Retrieve Objects from S3
 │
 ▼
Anonymize Names (if required)
 │
 ▼
Sort by Timestamp
 │
 ▼
Return JSON Response
```

---

# Storage Design

Feedback is stored as individual JSON objects within Amazon S3.

Object structure:

```
feedbacks/
├── 9fd0d95d.json
├── 2e431acf.json
├── 8ab41c22.json
```

Each object contains:

```json
{
  "name": "John Doe",
  "feedback": "Great application!",
  "timestamp": "2026-06-15T10:30:00Z"
}
```

Storing each submission independently simplifies retrieval and eliminates concurrent write conflicts.

---

# Security Design

The implementation follows AWS security best practices.

Implemented security measures include:

* Least-privilege IAM permissions
* Private Amazon S3 buckets
* HTTPS delivery through CloudFront
* JWT authentication using Amazon Cognito
* Server-side role validation
* No embedded AWS credentials
* Secure service-to-service communication using IAM roles

---

# Monitoring

Application monitoring is provided through Amazon CloudWatch.

Captured information includes:

* Lambda execution logs
* Request information
* Error messages
* Execution duration
* Debug output

CloudWatch logs simplify troubleshooting and operational monitoring during development.

---

# Infrastructure as Code

All AWS resources are provisioned using Terraform.

Provisioned resources include:

* Amazon API Gateway
* AWS Lambda
* Amazon S3
* Amazon CloudFront
* Amazon Cognito
* IAM Roles
* CloudWatch

Using Infrastructure as Code enables repeatable deployments without manual AWS Console configuration.

---

# Repository Structure

```
aws-serverless-feedback-api/
│
├── lambda/
│   └── lambda_function.py
│
├── terraform/
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
│
├── website/
│   ├── index.html
│   ├── styles.css
│   └── scripts.js
│
└── README.md
```

---

# Design Principles

The project follows several cloud-native design principles:

* Serverless First Architecture
* Infrastructure as Code
* Stateless Computing
* RESTful API Design
* Separation of Concerns
* Least-Privilege Security
* Modular Project Organization
* Managed AWS Services

---

# Current Status

**Version:** v1.0.0

The implementation successfully demonstrates:

* Fully serverless REST API development
* AWS Lambda and API Gateway integration
* Static website hosting using Amazon S3 and CloudFront
* Feedback persistence using Amazon S3
* Cognito-based authentication and role-aware responses
* Infrastructure provisioning using Terraform
* CloudWatch logging and monitoring
* Secure IAM-based service integration
* Clean separation between infrastructure, backend, and frontend

This project establishes the foundation for later weeks of the AWS Cloud & Serverless program, introducing serverless application development, Infrastructure as Code, authentication, and managed AWS services that are expanded in subsequent projects with DynamoDB, asynchronous processing, production deployment practices, and enterprise-scale architectures.
