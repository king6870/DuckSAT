import requests
import json

url = "https://api-azr.silverlining.cloud/qrcode/create-dynamic"

payload = json.dumps({
  "content": "https://www.ducksat.com",
  "background_color": "#FFFFFF",
  "fill_color": "#000000",
  "image_url": ""
})
headers = {
  'Ocp-Apim-Subscription-Key': 'b5564c04c31a45c2a162dd5290a4d804',
  'Content-Type': 'application/json'
}

response = requests.request("POST", url, headers=headers, data=payload)

print(response.text)