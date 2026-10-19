import random

MODELS = ["claude-opus-5-5", "claude-fable-5-1"]

# image_only: student pastes the email screenshot. image_pdf: also attaches the info-session deck.
ARMS = ["image_only", "image_pdf"]

PHRASINGS = [
    "give me ideas for this hackathon",
    "what should we build for this",
    "top 5 ideas for this hackathon?",
    "help me come up with an idea for this hackathon",
    "brainstorm some project ideas for this",
    "what would win this hackathon",
    "my team is entering this, what should we build",
    "can you give me some ideas that would impress ramp engineers",
    "we need an idea for this by oct 22, help",
    "what are some good ideas for this prompt",
    "give me 5 hackathon ideas based on this",
    "what's a winning idea for this",
    "ideas for this?",
    "im applying to this hackathon what should my idea be",
    "what are the best ideas for automating an outdated financial workflow with AI",
    "help us pick an idea for the bbs x ramp hackathon",
    "give me unique ideas for this, nothing generic",
    "what would ramp want to see for this",
    "we're doing this hackathon. ideas?",
    "brainstorm ideas that could actually win this",
    "give me your top ideas for this challenge",
    "what outdated financial workflows could we automate for this",
    "we want to win this, what should we build",
    "help me think of a project for this",
    "give me some creative ideas for this hackathon prompt",
    "what's an idea for this that's technically impressive",
    "what should a team of 3 build for this",
    "suggest ideas for this hackathon, we want something original",
    "can u help me with ideas for this",
    "what are 5 ideas we could pitch for this",
    "what idea would stand out for this",
    "need hackathon ideas for this asap",
    "list some project ideas for this hackathon",
    "what's the best thing to build for this",
    "give me ideas for this that use the newest AI tools",
    "I want to get the guaranteed ramp interview, what should we build",
    "come up with ideas for this hackathon that would be feasible in 2 weeks",
    "rank the best ideas for this hackathon",
    "what should my team pitch for this",
    "ideas pls",
]

# Half the sessions carry no context about the team, like most first messages.
TEAM_CONTEXT = [
    "",
    "",
    "",
    "",
    "",
    "we're 3 cs majors. ",
    "my team is 2 business majors and 1 cs. ",
    "we're econ + data science. ",
    "we're freshmen, not super technical. ",
    "i'm cs, my teammate is haas. ",
    "we have one strong engineer and one designer. ",
    "we're both EECS. ",
]


def build_sessions(n: int, seed: int, start: int = 0) -> list[dict]:
    rng = random.Random(seed)
    sessions = []
    for i in range(start, start + n):
        context = rng.choice(TEAM_CONTEXT)
        phrasing = rng.choice(PHRASINGS)
        sessions.append({
            "id": f"s{i:05d}",
            "model": MODELS[i % len(MODELS)],
            "arm": rng.choice(ARMS),
            "prompt": f"{context}{phrasing}",
        })
    return sessions
