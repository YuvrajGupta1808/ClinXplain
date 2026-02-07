import asyncio
import os
import re
from textwrap import dedent

import weave
from openai import OpenAI


class JsonModel(weave.Model):
    prompt: weave.Prompt = weave.StringPrompt(
        dedent("""
You are an expert JSON parsing assistant.
Input:
- 'context': A JSON object containing data.
- 'question': A specific query about the data.

Instructions:
1. Carefully analyze the deep structure of the JSON.
2. Resolve any references to keys or indices mentioned in the question.
3. Determine the final answer value.
4. Output the result wrapped in <answer> tags.

Constraint: Output ONLY the XML-wrapped answer. No other text.
""")
    )
    model: str = "OpenPipe/Qwen3-14B-Instruct"
    _client: OpenAI

    def __init__(self):
        super().__init__()
        self._client = OpenAI(
            base_url='https://api.inference.wandb.ai/v1',
            api_key=os.environ['WANDB_API_KEY'],
            project='yuvrajgupta1808-sfsu/medical-scribe-agent',
        )

    @weave.op
    def predict(self, context: str, question: str) -> str:
        response = self._client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": self.prompt.format()},
                {
                    "role": "user",
                    "content": f"Context: {context}\nQuestion: {question}",
                },
            ],
        )
        return response.choices[0].message.content


@weave.op
def correct_answer_format(answer: str, output: str) -> dict[str, bool]:
    parsed_output = re.search(r"<answer>(.*?)</answer>", output, re.DOTALL)
    if parsed_output is None:
        return {"correct_answer": False, "correct_format": False}
    return {"correct_answer": parsed_output.group(1) == answer, "correct_format": True}


if __name__ == "__main__":
    if not os.environ.get('WANDB_API_KEY'):
        print("WANDB_API_KEY is not set - make sure to export it in your environment or assign it in this script")
        exit(1)

    # Find your wandb API key at: https://wandb.ai/authorize
    weave.init("yuvrajgupta1808-sfsu/medical-scribe-agent")

    jsonqa = weave.Dataset.from_uri(
        "weave:///wandb/json-qa/object/json-qa:v3"
    ).to_pandas()

    model = JsonModel()

    eval = weave.Evaluation(
        name="json-qa-eval",
        dataset=weave.Dataset.from_pandas(jsonqa),
        scorers=[correct_answer_format],
    )

    asyncio.run(eval.evaluate(model))
