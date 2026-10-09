# Technical Constraints: Just One More

This document supplements the project description with the technical constraints for the MVP. These constraints should guide architecture, tooling, implementation, and deployment decisions.

## 1. Scope and Timeline

- This is a **one-day MVP for an AI hackathon**.
- Development, setup, testing, and preparation for the final presentation must fit within that single day.
- Prioritize a working, demonstrable multiplayer experience over production readiness or architectural complexity.
- If the full project scope cannot be implemented within one day, propose a reduced MVP scope and clearly identify deferred features.

## 2. Development and Infrastructure

- Local development and operation are the default starting point.
- There is no existing cloud environment, infrastructure, or production system.
- Do not assume that servers, databases, authentication services, deployment pipelines, or other supporting systems already exist.
- Any required components must be easy to set up within the hackathon timeframe.
- **Hosting is an option** if a suitable solution makes multiplayer access or the final presentation easier and can be used without incurring costs.
- Cloud services are not categorically excluded, but they must meet the zero-budget requirement.

## 3. Zero Budget and Credit Card Availability

- The MVP must be implemented and demonstrated **without spending money**.
- A credit card is available, so a credit-card requirement does not automatically disqualify a service.
- Providing a credit card must not be treated as permission to incur charges.
- Free hosting, free tiers, and other no-cost services may be considered.
- Prefer options with no automatic paid upgrades and enforceable safeguards against usage charges.
- Do not rely on billing alerts alone to prevent costs.

Before recommending an external service, verify and disclose:
- Its current free-tier or trial conditions.
- Whether an account or credit card is required.
- Relevant usage limits and whether they are sufficient for development and the presentation.
- Whether exceeding those limits stops the service or triggers charges.
- Whether a trial automatically converts to a paid plan.
- Any temporary card authorization holds.
- Any steps required to prevent charges or cancel resources afterward.

Do not enable paid plans, billable overages, or automatic paid upgrades without explicit approval. If a service cannot reliably remain free for the intended use, prefer another solution.

## 4. Accessibility and Multiplayer

- The application must be accessible to all intended participants through a browser.
- Multiple participants must be able to connect to the same game and play together in real time.
- A setup that works only for a single user on the developer's machine is insufficient.
- The exact access and hosting method is intentionally undecided.
- The solution must be free and practical for both the one-day MVP and the final presentation.

Potential approaches to evaluate, not predetermined requirements:
- Local hosting with access over a shared local network.
- Local hosting exposed through a free tunnel.
- A suitable free hosting service.
- Another zero-cost approach that supports the required multiplayer experience.

Clarify whether participants will share a local network or require access from different networks before committing to an approach. Do not assume that public internet access or a shared network is guaranteed.

## 5. Technical Decision Guidelines

- Choose the simplest approach that satisfies the MVP requirements.
- Minimize dependencies, setup time, and operational overhead.
- Prefer free tools and open-source components where practical.
- Do not introduce unnecessary production-grade systems.
- Evaluate local hosting and free hosted deployment based on setup effort, reliability, multiplayer connectivity, and cost safeguards.
- Verify multiplayer connectivity early, including support for real-time updates through the chosen access method.
- Check relevant hosting limitations, such as connection duration, WebSocket support, idle shutdowns, and cold starts.
- Document the steps required to start or deploy the application and connect participant devices.
- Clearly distinguish between what is implemented for the hackathon and what would be needed for a future production version.
 