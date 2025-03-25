# [Bug] SPVasset controller returns empty objects for GET and PUT endpoints

## Description
While fixing OCAE-304, we discovered that the SPVasset controller returns empty response objects (`{}`) for GET /api/spvassets/:id and PUT /api/spvassets/:id endpoints. Although the status codes are correct (200), the actual asset data is not being returned in the response.

## Expected Behavior
- GET /api/spvassets/:id should return the full asset object
- PUT /api/spvassets/:id should return the updated asset object

## Current Behavior
Both endpoints return status code 200 but with an empty response body `{}`.

## Steps to Reproduce
1. Make a GET request to /api/spvassets/:id with a valid ID
2. Make a PUT request to /api/spvassets/:id with update data
3. Observe that both return status 200 but empty response bodies

## Impact
This affects client applications that expect data to be returned from these API endpoints.

## Suggested Fix
Update the SPVasset controller methods to properly return the asset data in the response:

```javascript
// For getSPVAssetById
const asset = await SPVAsset.findById(req.params.id);
// Change from 
res.status(200).json({});
// To
res.status(200).json(asset);

// For updateSPVAsset
const updatedAsset = await SPVAsset.findByIdAndUpdate(req.params.id, req.body, { new: true });
// Change from
res.status(200).json({});
// To
res.status(200).json(updatedAsset);
```

## Related Issues
- OCAE-304: Fix SPVasset tests with JWT authentication

## Priority
Medium - Not blocking functionality but needs to be fixed for proper API usage.
