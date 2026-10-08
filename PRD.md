# Planly AI — Product Requirements Document

**Project Name:** Planly AI
**Repository:** `planly-ai`
**Product Type:** AI-powered personalized activity, social, weekend, and holiday planning assistant
**Status:** MVP / Development Planning
**Version:** 1.1

**Changelog:**
- 1.1: Stack changed to JavaScript/Node, Prisma + SQLite, LanceDB, OpenAI, plain HTML/CSS UI.
- 1.2: Every answer comes from a single LLM call with live web search. No rule-based processing, cached events or fallback answers. Recommendations must cite a page the model visited during that search (this replaces §30's local candidate-and-ranking pipeline).

---

# 1. Product Overview

**Planly AI** is a personalized AI assistant that helps adults decide how to spend their free time.

Instead of providing generic recommendations, Planly AI builds an evolving understanding of each user based on their:

* Likes
* Dislikes
* Hobbies
* Interests
* Activity preferences
* Social preferences
* Budget
* Travel preferences
* Location
* Previous conversations
* Previous recommendations
* User feedback

Planly AI combines this personal context with **fresh real-world information from the internet** to recommend relevant activities, events, places, weekend plans, short trips, and holidays.

The goal is not simply to answer:

> "What can I do this weekend?"

The goal is to answer:

> **"Knowing what I like, what I've done before, what I don't like, and what's happening around me right now, what would I genuinely enjoy doing?"**

---

# 2. Vision

> **Planly AI helps people spend their free time better by becoming a personal AI guide for experiences, social activities, weekends, and travel.**

Planly AI should gradually understand the user instead of requiring them to explain their preferences repeatedly.

The long-term vision is for Planly AI to feel like:

> "An AI that knows what I enjoy and helps me figure out what I should do."

---

# 3. Problem Statement

Adults frequently have free time but struggle to decide how to spend it meaningfully.

Common problems include:

* "What should I do this weekend?"
* "I'm bored. What can I do tonight?"
* "I want to meet new people."
* "I don't want to stay home again."
* "I want to go somewhere but don't know where."
* "Find something interesting near me."
* "I want to travel somewhere for a few days."
* "I want something different from what I normally do."
* "I don't want to spend too much."
* "I want to socialize but don't want to go clubbing."

Traditional search and recommendation systems often provide generic lists.

For example:

> "Top 10 things to do in Delhi."

Planly AI should instead answer:

> "Based on your interest in photography, preference for small groups, dislike of crowded places, current budget, available time, weather, and what's happening nearby, these are the activities I'd recommend."

---

# 4. Product Goals

## Primary Goals

### G1 — Personalization

Understand and maintain an evolving user profile.

### G2 — Context Awareness

Use relevant context such as:

* Current date
* Time
* Location
* Weather
* Budget
* Availability
* Travel distance
* Social preferences

### G3 — Live Information

Use current internet data when recommending real-world activities.

### G4 — Conversational Planning

Allow users to naturally describe what they want rather than forcing them through forms.

### G5 — Socialization

Help users discover activities where they can interact with other people.

### G6 — Continuous Learning

Use feedback and conversations to improve future recommendations.

### G7 — Actionable Plans

Turn recommendations into practical weekend or holiday itineraries.

---

# 5. Non-Goals

The initial MVP will not attempt to:

* Build a dating platform
* Match users directly with strangers
* Become a social network
* Handle complex flight booking
* Handle hotel booking directly
* Guarantee event availability
* Replace professional travel agents
* Provide medical or mental-health advice
* Automatically infer sensitive personal attributes

Direct user-to-user social matching may be considered in a future version.

---

# 6. Target Users

## Primary Users

Adults approximately 18–45 who:

* Want to explore new experiences
* Have free weekends or holidays
* Enjoy social activities
* Travel occasionally
* Want personalized recommendations
* Don't want to spend significant time researching activities
* Want to discover events and experiences near them

---

# 7. Core Use Cases

## UC-01 — Weekend Planning

### User

> "What should I do this weekend?"

### System

Planly AI should:

1. Understand the user's request.
2. Retrieve relevant preferences.
3. Retrieve relevant conversation memories.
4. Determine location.
5. Check current weather.
6. Search current activities/events.
7. Filter unsuitable activities.
8. Rank candidates.
9. Generate personalized recommendations.
10. Optionally create a weekend itinerary.

---

# 8. UC-02 — Find Something to Do

### User

> "I'm bored. Give me something to do tonight."

Planly AI should consider:

* Current time
* Current location
* Remaining available hours
* Weather
* User preferences
* Current events
* Opening hours
* Travel distance

The response should prioritize activities that can realistically happen **today**.

---

# 9. UC-03 — Social Activity

### User

> "I want to meet new people this weekend."

Planly AI should prioritize:

* Meetups
* Workshops
* Group sports
* Hiking groups
* Classes
* Community events
* Board-game events
* Networking events
* Group tours
* Cultural events
* Social clubs

The system should distinguish between:

**An activity someone can do**

and:

**An activity that creates an opportunity for social interaction.**

---

# 10. UC-04 — Holiday Planning

### User

> "I have four days off next month. Where should I go?"

Planly AI should consider:

* Available dates
* Budget
* Starting location
* Travel distance
* Travel time
* Interests
* Preferred environment
* Weather
* Social opportunities
* Previous travel preferences

It should produce destination recommendations and, if requested, a complete itinerary.

---

# 11. UC-05 — Modify a Plan

User:

> "I like this plan, but remove the museum."

Planly AI should modify the existing plan while preserving the other relevant activities.

---

# 12. UC-06 — Preference Learning

User:

> "I don't really like crowded places."

Planly AI should understand this as a potential preference.

It may store:

```text
preference:
crowded_places
value:
dislike
source:
user_conversation
```

Future recommendations should take this into account.

---

# 13. UC-07 — Explicit Feedback

After an activity recommendation, users can provide feedback:

* ❤️ Loved it
* 👍 Liked it
* 😐 It was okay
* 👎 Didn't like it
* 🚫 Never recommend this again

The feedback should influence future recommendations.

---

# 14. UC-08 — Preference Editing

Users must be able to manually edit their preferences.

Example:

### Interests

* Hiking
* Photography
* Cafés
* Live music

### Dislikes

* Nightclubs
* Crowded places

### Social preferences

* Small groups
* Meeting new people

### Budget

* ₹1,000–₹3,000

### Travel preference

* Up to 100 km

Users should be able to modify these preferences at any time.

---

# 15. Personalization System

Personalization is a core component of Planly AI.

The system should maintain two types of user information:

1. Explicit preferences
2. Inferred preferences

---

# 16. Explicit Preferences

Information directly provided by the user.

Examples:

```text
Interests
Hobbies
Likes
Dislikes
Budget
Travel radius
Preferred activities
Social preferences
Food preferences
Transportation preferences
Activity intensity
```

---

# 17. Inferred Preferences

Information learned from:

* Conversations
* Recommendation feedback
* Selected activities
* Rejected activities
* Saved plans
* Completed plans

Example:

User repeatedly selects:

> Group hiking activities

The system can infer:

```text
group_hiking_preference = high
```

However, inferred preferences should remain distinguishable from explicit preferences.

---

# 18. Preference Confidence

Each inferred preference should have a confidence value.

Example:

```json
{
  "preference": "outdoor_activities",
  "value": "high",
  "confidence": 0.82,
  "source": "conversation",
  "updated_at": "2026-10-08"
}
```

The system should not treat a single statement as a permanent preference.

---

# 19. Temporary vs Permanent Preferences

Planly AI must distinguish between:

### Temporary preference

> "I don't want trekking this weekend."

This applies to the current planning session.

### Permanent preference

> "I don't like trekking."

This should update the user's long-term profile.

This distinction prevents the recommendation system from incorrectly changing user preferences.

---

# 20. User Profile

Example:

```json
{
  "interests": [
    "hiking",
    "photography",
    "live_music",
    "cafes"
  ],
  "dislikes": [
    "nightclubs",
    "crowded_places"
  ],
  "budget": {
    "min": 1000,
    "max": 3000,
    "currency": "INR"
  },
  "social_preferences": {
    "meet_new_people": true,
    "preferred_group_size": "small"
  },
  "travel_preferences": {
    "maximum_distance_km": 100
  }
}
```

---

# 21. Conversation Memory

Planly AI should store conversations so that relevant context can be retrieved in future interactions.

Example:

### Conversation 1

> "I love hiking but don't like difficult trails."

### Conversation 2

> "I tried a group trek last weekend and really enjoyed meeting people."

The system can derive:

```text
Likes hiking
+
Prefers moderate difficulty
+
Enjoys group activities
=
High relevance for beginner/intermediate group hikes
```

---

# 22. Memory Architecture

Planly AI should use three levels of context.

## 22.1 Short-Term Memory

Current conversation.

Example:

```text
I have Saturday afternoon free.
```

---

## 22.2 Session Memory

Information related to the current planning task.

Example:

```text
Date: Saturday
Budget: ₹2,000
Location: Delhi
Activity type: Social
```

---

## 22.3 Long-Term Memory

Persistent user information.

Example:

```text
Likes:
Hiking
Photography
Live music

Dislikes:
Crowded clubs

Social:
Small-group activities

Budget:
Moderate
```

---

# 23. Memory Rules

The system should not save every message as a permanent memory.

Only information that is:

* Relevant
* Useful for future recommendations
* Stable enough to matter
* Explicitly stated
* Or sufficiently supported by repeated behavior

should become long-term memory.

---

# 24. Memory Transparency

Users should be able to see what Planly AI remembers.

Example:

### What Planly knows about you

**You told us**

* You enjoy photography.
* You don't like crowded clubs.
* You enjoy weekend trips.

**We learned**

* You often prefer outdoor activities.
* You tend to choose small-group activities.

Users should be able to:

* Edit
* Correct
* Delete

individual memories.

---

# 25. Live Data Requirement

Live data is a **mandatory requirement** for recommendations involving current real-world information.

Planly AI should not rely solely on LLM knowledge for:

* Events
* Current opening hours
* Current prices
* Current weather
* Current availability
* Current travel conditions
* Current activities
* Current local happenings

---

# 26. Live Information Sources

Potential integrations:

### Maps / Places

* Google Maps
* Places APIs
* OpenStreetMap

### Weather

* Weather APIs

### Events

* Event APIs
* Event websites
* Web search

### Travel

Potential future integrations:

* Flight APIs
* Train APIs
* Bus APIs
* Hotel APIs

---

# 27. Freshness

Each live result should contain metadata such as:

```json
{
  "source": "event_website",
  "retrieved_at": "2026-10-08T18:30:00Z"
}
```

The system should prefer the most recently verified information.

---

# 28. RAG

RAG should be used for relatively stable knowledge.

Examples:

* Destination guides
* Activity descriptions
* General travel information
* City guides
* User-specific semantic memories
* Internal knowledge documents

RAG should **not replace live search** for rapidly changing information.

---

# 29. RAG vs Live Search

| Data                       | Recommended Source            |
| -------------------------- | ----------------------------- |
| User profile               | SQLite (Prisma)               |
| User preferences           | SQLite (Prisma)               |
| User memories              | SQLite (Prisma) + LanceDB     |
| Conversations              | SQLite (Prisma)               |
| General activity knowledge | RAG (LanceDB)                 |
| Destination knowledge      | RAG (LanceDB)                 |
| Current events             | Live Web                      |
| Current weather            | Open-Meteo API                |
| Current places             | Maps                          |
| Opening hours              | Live source                   |
| Current prices             | Live source                   |
| Travel availability        | Travel API                    |

---

# 30. Recommendation Engine

The recommendation engine should follow:

```text
User Request
      ↓
Intent Detection
      ↓
User Profile Retrieval
      ↓
Relevant Memory Retrieval
      ↓
Current Context
      ↓
Live Data Retrieval
      ↓
Candidate Generation
      ↓
Filtering
      ↓
Ranking
      ↓
LLM Reasoning
      ↓
Personalized Recommendations
```

---

# 31. Recommendation Scoring

Each candidate activity should be scored based on multiple factors.

Example:

```text
Recommendation Score =

Preference Match
+
Social Match
+
Location Match
+
Budget Match
+
Time Match
+
Weather Match
+
Freshness
+
Novelty
```

The exact weighting can evolve as the system is tested.

---

# 32. Personalization Score

A candidate could contain:

```json
{
  "activity": "Photography Walk",
  "scores": {
    "preference_match": 0.94,
    "social_match": 0.85,
    "location_match": 0.91,
    "budget_match": 0.95,
    "weather_match": 0.88,
    "novelty": 0.76
  }
}
```

---

# 33. Novelty

Planly AI should avoid repeatedly recommending the same types of experiences.

If a user likes cafés, the system should eventually expand into:

* New cafés
* Coffee workshops
* Coffee tastings
* Book cafés
* Photography cafés
* Café + live music
* Food walks

This creates discovery rather than repetition.

---

# 34. Socialization Score

Activities can have a social score.

Example:

| Activity                 | Social Score |
| ------------------------ | -----------: |
| Watching a movie at home |            0 |
| Solo café                |            2 |
| Restaurant               |            3 |
| Workshop                 |            7 |
| Group hike               |            9 |
| Meetup                   |           10 |

If a user explicitly wants to socialize, social score should receive greater weight.

---

# 35. Recommendation Explanation

Every recommendation should explain why it was selected.

Example:

> **Weekend Photography Walk**
>
> I picked this because you previously mentioned photography, you prefer outdoor activities, and you've said you'd like to meet more people. It's also within your preferred travel distance.

This increases user trust.

---

# 36. Agentic Architecture

LangGraph.js (`@langchain/langgraph`) should orchestrate the planning workflow.

```text
                    USER
                      |
                      v
              Intent Detection
                      |
                      v
              Context Retrieval
                      |
        +-------------+-------------+
        |             |             |
        v             v             v
     Profile       Location       Time
        |             |             |
        +-------------+-------------+
                      |
                      v
              Planning Agent
                      |
        +-------------+-------------+
        |             |             |
        v             v             v
     Web Search    Weather        Maps
        |             |             |
        +-------------+-------------+
                      |
                      v
              Candidate Results
                      |
                      v
             Preference Filtering
                      |
                      v
                  Ranking
                      |
                      v
               LLM Reasoning
                      |
                      v
             Personalized Plan
                      |
                      v
                 Response
```

---

# 37. Agent Components

The initial implementation should avoid unnecessary multi-agent complexity.

Start with one LangGraph workflow.

Potential nodes:

### Intent Node

Determines whether the user wants:

* Weekend plan
* Local activity
* Social activity
* Holiday
* Restaurant
* Trip
* Modify existing plan
* General discovery

### Profile Node

Retrieves relevant preferences.

### Memory Node

Retrieves relevant previous conversations/memories.

### Discovery Node

Searches current internet data.

### Weather Node

Retrieves weather information.

### Location Node

Determines distance and travel context.

### Ranking Node

Scores candidate activities.

### Planning Node

Builds the final plan.

### Memory Update Node

Stores useful new information.

---

# 38. Agent Workflow

```text
START
  |
  v
Understand Intent
  |
  v
Retrieve Profile
  |
  v
Retrieve Relevant Memories
  |
  v
Analyze Current Context
  |
  v
Does Request Need Live Data?
  |
  +---- NO ----> RAG / Memory
  |
  +---- YES
          |
          v
      Web Search
          +
       Weather
          +
        Maps
          +
        Events
          |
          v
    Candidate Generation
          |
          v
    Preference Filtering
          |
          v
        Ranking
          |
          v
     LLM Reasoning
          |
          v
    Generate Response
          |
          v
    Save Relevant Memory
          |
          v
         END
```

---

# 39. Important Architecture Principle

The LLM should **not invent activities**.

Bad architecture:

```text
User
 ↓
LLM
 ↓
"Here are 10 activities"
```

Preferred architecture:

```text
Live Data
    ↓
Real Candidates
    ↓
Structured Filtering
    ↓
Ranking
    ↓
LLM
    ↓
Personalized Explanation
```

The LLM is responsible for reasoning and communication, while external systems provide factual real-world information.

---

# 40. User Interface

## Home Screen

```text
Good morning 👋

What do you want to do?

[ Plan my weekend ]

[ Find something to do ]

[ Plan a trip ]

[ Meet new people ]

[ Surprise me ]

----------------------------

Recommended for you

• Photography walk
• Live music
• New café
• Weekend trek
```

---

# 41. Chat Interface

Chat is the primary interaction mechanism.

Example:

```text
User:
I'm bored. I want to do something this weekend.

Planly:
Sure. I remember you enjoy photography,
cafés and live music.

Are you looking for something:

[ Relaxing ]
[ Social ]
[ Adventurous ]
[ Surprise me ]
```

---

# 42. Plan View

```text
YOUR WEEKEND

Saturday
────────────

10:00 AM
Photography Walk

12:30 PM
Lunch

3:00 PM
Art Exhibition

7:30 PM
Live Music


Sunday
────────────

9:00 AM
Café

11:00 AM
Workshop
```

Each plan item should provide:

* Location
* Distance
* Estimated duration
* Price
* Source
* Current availability where available
* Map link
* Event link where applicable

---

# 43. Map View

Map view should display:

* Activities
* Events
* Places
* Routes
* Distance
* Estimated travel time

---

# 44. Profile Screen

Example:

```text
Your Preferences

Interests
✓ Hiking
✓ Photography
✓ Live Music
✓ Cafés

Dislikes
× Nightclubs
× Very crowded places

Social
✓ Small groups
✓ Meet new people

Budget
₹1,000 – ₹3,000

Travel
Up to 100 km

[ Edit Preferences ]
```

---

# 45. Feedback UI

Recommendations should support:

```text
❤️ Like
👎 Dislike
🔖 Save
🚫 Not interested
```

Optional feedback reasons:

* Too expensive
* Too far
* Not interested
* Already visited
* Too crowded
* Wrong time
* Not social enough
* Weather doesn't suit me

---

# 46. Plan Management

Users should be able to:

* Save plans
* Edit plans
* Delete plans
* Duplicate plans
* Regenerate individual activities
* Regenerate an entire day
* Change budget
* Change location
* Change activity type

---

# 47. Example User Journey

## Step 1 — Onboarding

User:

> "I like hiking, photography, cafés and live music. I don't like clubs."

Planly stores the preferences.

---

## Step 2 — User asks

> "I'm free this weekend. What should I do?"

---

## Step 3 — Planly retrieves

```text
User profile
+
Relevant memory
+
Current location
+
Current date
+
Weather
+
Current events
+
Places
```

---

## Step 4 — Planly generates

### Option 1

**Group Photography Walk**

Reasons:

* Photography interest
* Outdoor activity
* Social opportunity
* Nearby

### Option 2

**Live Music + Café**

Reasons:

* Live music
* Café preference
* Lower social pressure

### Option 3

**Beginner Group Trek**

Reasons:

* Hiking preference
* Group experience
* Suitable weather

---

# 48. Conversation Example

### User

> I don't want trekking this weekend.

### Planly

Understands this as a temporary constraint.

It should not automatically change:

```text
Long-term hiking preference = false
```

Instead:

```text
Current session:
trekking = excluded
```

---

# 49. Long-Term Learning Example

If the user repeatedly says:

> "I don't enjoy trekking anymore."

Then Planly can ask:

> "It sounds like your preference may have changed. Would you like me to update your profile and stop recommending trekking?"

This prevents accidental preference changes.

---

# 50. Data Model

Core entities:

```text
User
UserProfile
Preference
PreferenceHistory
Conversation
Message
Memory
Plan
PlanItem
Activity
Place
Event
Recommendation
Feedback
SearchResult
```

---

# 51. Database Relationship

```text
User
 |
 +-- Profile
 |
 +-- Preferences
 |
 +-- PreferenceHistory
 |
 +-- Memories
 |
 +-- Conversations
 |
 +-- Feedback
 |
 +-- Plans
       |
       +-- PlanItems
              |
              +-- Activity
              +-- Place
              +-- Event
```

---

# 52. Preference History

Preferences should not simply be overwritten.

Maintain history.

Example:

```text
Hiking
----------------
Jan 2026 → High
May 2026 → Medium
Aug 2026 → High
```

This allows the system to understand changing preferences.

---

# 53. Privacy

Because Planly stores personal preferences, conversations, and potentially location information, privacy is a core requirement.

The system must:

* Secure authentication.
* Encrypt data in transit.
* Protect stored user data.
* Restrict access to user information.
* Allow users to delete conversations.
* Allow users to delete memories.
* Allow users to edit preferences.
* Explain what information is stored.
* Avoid unnecessary collection of personal information.
* Treat LanceDB vector files as user data: keep them on encrypted storage and include them in delete-memory and delete-account flows.

---

# 54. Location Privacy

Location should be treated as contextual data.

The system should request permission before accessing precise location.

Users should be able to choose:

* Use current location
* Enter a location manually
* Use saved location
* Disable location-based recommendations

---

# 55. Safety

Planly AI should avoid recommending unsafe or suspicious activities.

The system should be cautious with:

* Dangerous activities
* Suspicious events
* Unverified organizations
* Unsafe locations
* Illegal activities

For high-risk activities, recommendations should use reliable sources and appropriate warnings.

---

# 56. MVP Scope

The MVP should include:

## Authentication

* Signup
* Login
* User profile

## Personalization

* Likes
* Dislikes
* Hobbies
* Interests
* Budget
* Social preferences
* Travel radius

## Chat

* Persistent conversations
* Context retrieval

## Memory

* Long-term preferences
* Relevant conversation memory
* Explicit feedback

## Live Data

* Web search
* Weather
* Maps/location
* Current events

## Recommendation

* Local activities
* Weekend planning
* Social activities
* Personalized recommendations

## Planning

* Generate weekend plan
* Modify plan
* Save plan

---

# 57. Phase 2

Potential features:

* Holiday planning
* Multi-day itineraries
* Flight search
* Hotel search
* Restaurant reservations
* Calendar integration
* Event booking links
* Advanced preference learning
* Recommendation analytics

---

# 58. Phase 3

Potential social platform functionality:

* Find other people interested in the same activity
* Group planning
* Shared itineraries
* Group events
* Community recommendations
* Activity groups

Direct stranger matching should only be introduced after strong privacy, safety, moderation, and identity systems are implemented.

---

# 59. Recommended Technology Stack

## Frontend

```text
HTML5
CSS3 (custom, no framework)
Vanilla JavaScript (ES modules, fetch, Server-Sent Events for streaming chat)
Static files served by the backend — no build step
```

## Backend

```text
Node.js (LTS)
JavaScript (ES modules, no TypeScript)
Express
```

## AI / Agent

```text
LangGraph.js
OpenAI (Responses API: structured outputs + hosted web search)
OpenAI embeddings (text-embedding-3-small)
Tool Calling
```

## Database

```text
SQLite (local file, data/planly.db)
Prisma ORM (schema.prisma, Prisma Migrate)
```

Prisma keeps a later move to PostgreSQL to a datasource change plus a fresh migration.

## Vector Database

```text
LanceDB (embedded, local files under data/lancedb/)
Stores memory embeddings and RAG documents with userId metadata for per-user filtering
```

Prisma owns the relational data and LanceDB owns the embeddings. Each LanceDB row stores the Prisma `Memory.id` and `userId` so the two stores stay linked.

## External Services

```text
Web Search / Events   OpenAI hosted web search (results must cite a source URL)
Places                OpenStreetMap via the Overpass API (no key)
Weather               Open-Meteo (no key)
Geocoding             Open-Meteo geocoding, Nominatim reverse geocoding (no key)
```

The public Overpass servers are often overloaded. A keyed places provider is recommended before launch.

---

# 60. High-Level Architecture

```text
                    ┌─────────────────┐
                    │ HTML / CSS / JS │
                    │ Frontend(static)│
                    └────────┬────────┘
                             │
                             ↓
                    ┌─────────────────┐
                    │ Node.js+Express │
                    │    Backend      │
                    └────────┬────────┘
                             │
                             ↓
                    ┌─────────────────┐
                    │  LangGraph.js   │
                    │ Agent Workflow  │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          ↓                  ↓                  ↓
   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
   │   SQLite    │    │   LanceDB   │    │ Live Tools  │
   │  (Prisma)   │    │   (local)   │    │             │
   │ Users       │    │ Memories    │    │ Web Search  │
   │ Profiles    │    │ RAG         │    │ Maps        │
   │ Chats       │    │ Embeddings  │    │ Weather     │
   │ Plans       │    │             │    │ Events      │
   └─────────────┘    └─────────────┘    └─────────────┘
                             │
                             ↓
                    ┌─────────────────┐
                    │ Recommendation  │
                    │     Engine      │
                    └────────┬────────┘
                             │
                             ↓
                    ┌─────────────────┐
                    │       LLM       │
                    │ Reasoning +     │
                    │ Response        │
                    └─────────────────┘
```

---

# 61. Core Product Loop

The core Planly AI loop is:

```text
              USER
                ↓
          Talks to AI
                ↓
       AI understands intent
                ↓
        Retrieves context
                ↓
       Retrieves preferences
                ↓
      Searches current world
                ↓
       Finds real options
                ↓
      Personalizes results
                ↓
        Creates a plan
                ↓
       User tries the plan
                ↓
         Gives feedback
                ↓
          AI learns
                │
                └───────────────→
```

This loop is the foundation of Planly AI.

---

# 62. Key Product Differentiator

Planly AI should not position itself simply as:

> **"An AI travel planner."**

Its core positioning should be:

> **"A personalized AI companion that helps you decide how to spend your free time."**

Travel is one part of the product.

The broader experience includes:

* Weekend plans
* Local discovery
* Social activities
* Events
* Hobbies
* Short trips
* Holidays
* New experiences

---

# 63. Primary Success Metric

## Meaningful Activity Rate

The percentage of recommendations that users:

* Save
* Accept
* Complete
* Or explicitly report enjoying

This is more meaningful than measuring the number of AI conversations.

The purpose of Planly AI is not to keep users talking to the AI.

The purpose is to help users **discover and experience things in the real world.**

---

# 64. Supporting Metrics

### Personalization

* Recommendation acceptance rate
* Like/dislike ratio
* Preference correction rate
* Repeat recommendation engagement

### Planning

* Plans generated
* Plans saved
* Plans modified
* Plans completed

### Socialization

* Social activity selections
* Group activity selections
* User-reported social satisfaction

### AI

* Retrieval relevance
* Recommendation relevance
* Tool-call success rate
* Live-data freshness
* Hallucination rate
* Memory retrieval accuracy

---

# 65. MVP Acceptance Criteria

The MVP is considered successful when a user can:

1. Create an account.
2. Configure interests, hobbies, likes, dislikes, budget, and social preferences.
3. Chat with Planly AI.
4. Have relevant conversations stored.
5. Ask for a weekend plan.
6. Have Planly retrieve relevant profile context.
7. Search current internet information.
8. Use current weather/location information.
9. Discover real activities and events.
10. Receive personalized recommendations.
11. Understand why each recommendation was selected.
12. Generate a weekend itinerary.
13. Modify the itinerary conversationally.
14. Save the plan.
15. Give feedback.
16. Have future recommendations influenced by that feedback.
17. View and edit stored preferences/memories.

---

# 66. Example End-to-End Scenario

### Initial Profile

```text
Interests:
Photography
Hiking
Cafés
Live music

Dislikes:
Nightclubs
Crowded places

Social:
Wants to meet new people

Budget:
₹3,000

Travel:
Within 50 km
```

### User

> "I'm free this weekend. I don't want to stay home."

### Planly

Retrieves:

```text
Profile
+
Past conversations
+
Previous feedback
+
Current location
+
Current date
+
Weather
+
Current events
+
Places
```

### Recommendation

> **1. Group Photography Walk**
>
> This matches your interest in photography, gives you an opportunity to meet people, and is within your preferred travel distance.

> **2. Live Music + Café**
>
> You previously mentioned enjoying live music and cafés. This option is more relaxed and doesn't involve a large crowd.

> **3. Beginner Group Hike**
>
> You enjoy hiking and this weekend's weather is suitable. The group format also fits your preference for social activities.

### User

> "I don't want hiking this weekend."

### Planly

Removes hiking from the current plan and suggests another activity.

### After the weekend

> "How was the photography walk?"

User:

> "Loved it. I really liked meeting people through photography."

Planly updates its understanding:

```text
Photography = high
Group photography = high
Social activity = high
```

Future recommendations become more relevant.

---

# 67. Long-Term Vision

Planly AI can eventually become a **personal experience operating system**.

Instead of users constantly asking:

> "What should I do?"

Planly could proactively surface opportunities:

> **"You have a free Saturday coming up. There's a photography walk that matches your interests and a small-group food workshop nearby. Want me to build a plan?"**

Over time, Planly should understand:

```text
Who you are
+
What you enjoy
+
What you avoid
+
How you spend your free time
+
What you've enjoyed previously
+
What is happening around you
=
Better experiences
```

---

# 68. Product Statement

> **Planly AI is a personalized, context-aware AI experience planner that learns what you like, remembers what you've done, searches the current world for real opportunities, and helps you turn free time into meaningful experiences.**
