# Technical Design and UML Specifications

This document outlines the database entities, relationships, use cases, and service timelines of the AI-Driven Food Sharing Platform.

---

## 1. Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    USERS {
        int id PK
        string username
        string email
        string password_hash
        string role
        float latitude
        float longitude
        string address
        string phone
        string status
        timestamp created_at
    }
    
    NGO_PROFILES {
        int user_id PK, FK
        string organization_name
        string registration_number
        string tax_id
        int capacity_people
        string preferred_food_types
        boolean verified
        string website
    }
    
    FOOD_DONATIONS {
        int id PK
        int donor_id FK
        string title
        text description
        string food_type
        float quantity
        string quantity_unit
        string storage_condition
        float temperature_celsius
        datetime prep_time
        datetime estimated_expiry
        float remaining_shelf_life_hours
        string risk_level
        string status
        string image_url
        string qr_code_data
        timestamp created_at
    }

    DONATION_REQUESTS {
        int id PK
        int donation_id FK
        int ngo_id FK
        string status
        timestamp requested_at
        timestamp updated_at
    }

    DELIVERIES {
        int id PK
        int donation_id FK
        int request_id FK
        int ngo_id FK
        string volunteer_name
        string volunteer_phone
        string tracking_status
        string verification_code
        timestamp started_at
        datetime completed_at
    }

    CHAT_MESSAGES {
        int id PK
        int sender_id FK
        int receiver_id FK
        int donation_id FK
        text message
        timestamp sent_at
    }

    NOTIFICATIONS {
        int id PK
        int user_id FK
        string type
        string title
        text message
        boolean is_read
        timestamp created_at
    }

    USERS ||--|| NGO_PROFILES : "has profile"
    USERS ||--o{ FOOD_DONATIONS : "donates"
    USERS ||--o{ DONATION_REQUESTS : "requests"
    USERS ||--o{ NOTIFICATIONS : "receives"
    
    FOOD_DONATIONS ||--o{ DONATION_REQUESTS : "has request options"
    FOOD_DONATIONS ||--o{ DELIVERIES : "tracked by"
    DONATION_REQUESTS ||--|| DELIVERIES : "initiates"
    
    USERS ||--o{ CHAT_MESSAGES : "sends"
    FOOD_DONATIONS ||--o{ CHAT_MESSAGES : "subject of"
```

---

## 2. Use Case Diagram

```mermaid
graph TD
    %% Actors
    Donor((Donor))
    NGO((NGO / Receiver))
    Admin((Admin))

    %% Use Cases
    UC1(Register / Log In)
    UC2(Post Food Surplus)
    UC3(AI Expiry Predictor)
    UC4(Browse Surplus Items)
    UC5(Request Food Claim)
    UC6(Smart Match Recommendation)
    UC7(Approve Claims & Route Delivery)
    UC8(Volunteer Delivery Tracking)
    UC9(Verify QR / Verification Code)
    UC10(Verify NGOs)
    UC11(Export Reports & Excel Logs)
    UC12(Toggle User Suspension)

    %% Associations
    Donor --> UC1
    Donor --> UC2
    Donor --> UC3
    Donor --> UC6
    Donor --> UC7
    
    NGO --> UC1
    NGO --> UC4
    NGO --> UC5
    NGO --> UC8
    NGO --> UC9

    Admin --> UC1
    Admin --> UC10
    Admin --> UC11
    Admin --> UC12

    %% Dependencies
    UC2 -.-> |"includes"| UC3
    UC7 -.-> |"includes"| UC8
    UC8 -.-> |"includes"| UC9
```

---

## 3. Sequence Diagram - Food Matching & Expiry Tracking

This sequence diagram depicts the transaction timeline from a donor publishing food surplus to the final NGO verification.

```mermaid
sequenceDiagram
    autonumber
    actor Donor
    participant WebApp as React Frontend
    participant Server as Flask REST API
    participant ML as ML Expiry Predictor
    participant DB as MySQL DB
    actor NGO

    Donor->>WebApp: Submit Surplus Details (Type, Temp, Prep time)
    WebApp->>Server: POST /api/donations (multipart form)
    Server->>ML: predict_remaining_shelf_life(params)
    Note over ML: Runs saved Random Forest model
    ML-->>Server: Return: shelf_life_hours
    Server->>DB: INSERT INTO food_donations (estimated_expiry, risk_level)
    DB-->>Server: OK
    Note over Server: Generates unique QR code image
    Server-->>WebApp: Return: donation_id, QR image URL, Expiry estimate
    WebApp-->>Donor: Render success & matching suggestions

    Note over NGO: Browses map or local dashboard
    NGO->>WebApp: Request Surplus Food Claim
    WebApp->>Server: POST /api/ngo/requests (donation_id)
    Server->>DB: INSERT INTO donation_requests (status=pending)
    DB-->>Server: OK
    Server->>DB: INSERT INTO notifications (donor_id, new request Alert)
    Server-->>WebApp: Return pending success
    WebApp-->>NGO: Show request submitted

    Donor->>WebApp: Approve NGO Request
    WebApp->>Server: POST /api/ngo/requests/{req_id}/approve
    Server->>DB: UPDATE donation_requests (status=accepted)
    Server->>DB: UPDATE food_donations (status=accepted)
    Note over Server: Create Delivery with Verification Code (VRFY-XXXX)
    Server->>DB: INSERT INTO deliveries (status=assigned)
    DB-->>Server: OK
    Server-->>WebApp: Approve Success
    WebApp-->>Donor: Show delivery assigned

    Note over NGO: Dispatches volunteer to donor location
    NGO->>WebApp: Pickup food, enter Volunteer details
    WebApp->>Server: PATCH /api/ngo/deliveries/{del_id} (picked_up)
    Server->>DB: UPDATE deliveries (status=picked_up)
    
    Note over NGO: Delivery arrives, shares VRFY code
    NGO->>WebApp: Enter Code (VRFY-XXXX) or scan QR
    WebApp->>Server: PATCH /api/ngo/deliveries/{del_id} (delivered, verify_code)
    Note over Server: Matches verification code in DB
    Server->>DB: UPDATE deliveries (status=delivered, completed_at=now)
    Server->>DB: UPDATE food_donations (status=completed)
    DB-->>Server: OK
    Server-->>WebApp: Verification Approved
    WebApp-->>NGO: Complete & Success Screen!
```
