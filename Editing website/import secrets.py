import secrets
print(secrets.token_hex(16))

import os
open.api_key = os.getenv('OPENAI_API_KEY')
