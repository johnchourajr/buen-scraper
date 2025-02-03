# Buen Scraper API

A web scraping API that allows you to extract content from web pages using CSS selectors.

## Access

To get API access:
1. Email hi@john.design for an API key
2. Include your use case and expected request volume
3. We'll respond with your API key and rate limit details

## API Reference

### Endpoint

```
GET /api/scrape/{encodedUrl}
```

### Headers

- `x-api-key`: Your API key (required)

### URL Parameters

- `encodedUrl`: The URL-encoded target website URL
- `selector`: (optional) CSS selector to target specific elements. Defaults to 'body'

### Example Request

```bash
curl -X GET \
  'https://your-domain.com/api/scrape/https%3A%2F%2Fexample.com?selector=%23main-content' \
  -H 'x-api-key: your-api-key'
```

### Response Format

```json
{
  "url": "https://example.com",
  "title": "Page Title",
  "targetSelector": "#main-content",
  "content": {
    "tag": "div",
    "text": "Content text",
    "attributes": {
      "id": "main-content",
      "class": "container"
    },
    "children": [
      // Nested elements
    ]
  }
}
```

### Error Responses

- `401`: Invalid or missing API key
- `400`: Invalid URL or parameters
- `500`: Server error or scraping failed

## Rate Limiting

Contact hi@john.design for rate limit information and custom quota requests.

## Best Practices

1. URL encode your target URLs
2. Use specific CSS selectors to minimize response size
3. Handle rate limits and errors gracefully
4. Cache responses when possible

## Support

For support or questions, email hi@john.design
