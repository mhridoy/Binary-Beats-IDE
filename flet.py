from openai import OpenAI
import openai
client = OpenAI()
openai.api_key = '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'
response = client.chat.completions.create(
  model="gpt-4",
  messages=[
    {
      "role": "user",
      "content": "Write a lesson plan for an introductory algebra class. The lesson plan should cover the distributive law, in particular how it works in simple cases involving mixes of positive and negative numbers. Come up with some examples that show common student errors."
    }
  ],
  temperature=0.7,
  max_tokens=64,
  top_p=1
)