# Multimodal Generation APIs

**Endpoint Count:** 8

## Overview

This category contains 8 endpoints for multimodal generation operations.


## Multimodal Generation


### `GET /v1/multimodal/health`

**Summary:** Multimodal Health

Health check for multimodal service

Returns GPU endpoint availability and RunPod connection status

**Success Response (200):** Successful Response

---

### `POST /v1/multimodal/image`

**Summary:** Generate Image

Generate image from text using Qwen Image Edit

**Cost**: 50 credits per image (~$0.025 at 100% margin)

**Features**:
- High-quality image generation
- LoRA style transfer support
- Resolutions up to 2048x2048
- Fast generation (~10s)

**Rate Limits**: 5 requests/minute per user

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `POST /v1/multimodal/tts`

**Summary:** Generate Tts

Generate speech from text using MiniMax TTS

**Cost**: 14 credits per generation (~$0.007 at 100% margin)

**Features**:
- High-quality text-to-speech
- Multiple voice profiles
- Fast generation (~30s)
- MP3 output format

**Rate Limits**: 10 requests/minute per user

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/multimodal/usage`

**Summary:** Get Usage History

Get user's multimodal API usage history

Returns paginated list of generation requests with status, credits used, and results.

**Query Parameters**:
- `skip`: Number of records to skip (default 0)
- `limit`: Maximum records to return (default 50, max 100)
- `endpoint_type`: Filter by type ('tts', 'image', 'video_i2v', 'video_t2v', 'video_cogvideox')

**Parameters:**

- `skip` (query): No description
- `limit` (query): No description
- `endpoint_type` (query): Filter by endpoint type

**Success Response (200):** Successful Response

---

### `GET /v1/multimodal/usage/{usage_id}`

**Summary:** Get Usage Record

Get specific usage record by ID

Returns detailed information about a single generation request.

**Parameters:**

- `usage_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/multimodal/video/cogvideox`

**Summary:** Generate Video Cogvideox

Generate video using CogVideoX-2B (dedicated model)

**Cost**: 800 credits per video (~$0.40 at 100% margin)

**Features**:
- High-quality text-to-video generation
- Dedicated CogVideoX-2B model
- Configurable frame count (17, 33, or 49 frames)
- Adjustable guidance scale and inference steps
- 8 FPS output, MP4 format
- Generation time: ~120 seconds

**Rate Limits**: 1 request/minute per user
**Container**: v4-fixed (green screen issue resolved)

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `POST /v1/multimodal/video/i2v`

**Summary:** Generate Video I2V

Generate video from image (Image-to-Video)

**Providers**:
- `seedance` (default): 520 credits (~$0.26) - 5 seconds, 1280x720
- `sora2` (premium): 800 credits (~$0.40) - 4 seconds, cinematic quality

**Features**:
- Animate static images with motion
- Frame interpolation for smooth video
- 720p HD output
- Generation time: ~90 seconds

**Rate Limits**: 2 requests/minute per user

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `POST /v1/multimodal/video/t2v`

**Summary:** Generate Video T2V

Generate video from text (Text-to-Video)

**Cost**: 1000 credits per video (~$0.50 at 100% margin)

**Features**:
- Full video generation from text prompts
- 1280x720 HD resolution
- Up to 10 seconds duration
- Advanced motion and scene composition
- Generation time: ~90 seconds

**Rate Limits**: 1 request/minute per user
**Tier**: Premium tier only

**Request Body:** JSON

**Success Response (201):** Successful Response

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
