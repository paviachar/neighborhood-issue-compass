# Neighborhood Issue Compass

Build the CivicSense AI live web application prototype as specified:

# MASTER PROJECT PROMPT – CIVICSENSE AI
## Project Title
CivicSense AI – From Complaints to Action

### Project Objective
Build a modern, responsive, AI-powered civic complaint management and intelligent action platform for the PromptWars x ASTRA hackathon.
The platform should help citizens report public infrastructure problems and help authorities understand, prioritize, track, and resolve those problems efficiently.
The application must be a functional working prototype, not just a static UI.

Implement as a live web application:
- Frontend with Leaflet.js interactive OpenStreetMap maps, Chart.js / Recharts analytics, modern navy blue/light blue/white civic design, responsive layout.
- Two main interfaces: Citizen Portal (submit with category, description, photo upload, map pin location picker, get tracking ID, track lifecycle SUBMITTED → ASSIGNED → IN PROGRESS → RESOLVED, view history) and Authority / Administrator Dashboard (all complaints table, search & filters, AI summaries, duplicate review & linking, explainable priority scoring 0-100, department assignment, status updates, hotspot detection, and AI action briefs).
- AI Intelligence Module: automatic categorization, concise summaries, duplicate detection (text + category + geographic proximity), explainable priority scoring (40 safety, 30 urgency, 20 duplicates, 10 impact with breakdown and reasoning), and concise AI action briefs for authorities. Include fallback rule-based analysis.
- Seed at least 50 realistic synthetic complaints across categories (Road Damage, Waterlogging, Waste Management, Streetlight, Drainage, Public Safety, Other) with deliberate duplicate pairs, geographic clusters, varying priority levels, and statuses.

This project was built with [Lovable](https://lovable.dev).

DEPLOYMENT LINK :https://neighborhood-issue-compass.vercel.app/report

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1301fda7-3d62-48d5-a8f4-7d6e7d2c74de).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
