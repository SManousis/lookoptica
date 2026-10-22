# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary users are consumers across Greece shopping for eyewear, contact lenses, low-vision products, and related optical services. Local customers in Attica can also use the at-home eyewear selection service when visiting the physical store is inconvenient.

## Product Purpose

Look Optica combines an online optical shop with expert guidance from a physical optical practice. It helps customers discover, compare, and buy suitable optical products with confidence, while retaining access to personal assistance and local services.

Success means customers throughout Greece can find good-value products, understand their choices, complete purchases reliably, and reach qualified optical guidance when they need it.

## Positioning

Look Optica competes on price and value without reducing optical products to an unsupported commodity purchase. Its differentiator is the combination of accessible pricing, expert optical guidance, and service options connected to a real optical shop.

## Operating Context

- Customers browse and search products, compare brands and prices, use wishlists, manage an account, and complete checkout online.
- The catalog includes eyewear, sunglasses, contact lenses, low-vision products, and accessories.
- The business also serves customers through its physical shop in Chalandri.
- An at-home eyewear selection service is available within Attica for customers who cannot easily visit the store. The current published service permits a selection of up to 30 pairs, has a EUR 15 visit fee deducted from purchases over EUR 60, and does not add delivery charges for prescription-eyewear orders.
- Customer support currently includes the website contact form, telephone, and email.
- The product should be able to adapt its customer communication and service workflows to messaging services in the future. Specific platforms, integrations, consent flows, and operating procedures remain undecided.

## Capabilities and Constraints

- The customer-facing experience is Greek-first and serves customers across Greece.
- The web application includes catalog and category browsing, search and filtering, product detail pages, contact-lens variants, customer registration and login, wishlists, cart, checkout, payment flows, reviews, contact and newsletter forms, and informational service pages.
- Staff use a protected administration interface for products, contact lenses, media, reviews, promotions, orders, imports, and related store operations.
- The existing implementation uses React and Vite for the frontend, FastAPI for the backend, and SQLAlchemy/Alembic with PostgreSQL in production-oriented documentation.
- The application handles personal and transactional data and must retain appropriate security, privacy, consent, and audit controls.
- Messaging-service support is a future capability; no provider or customer promise should be implied until one is selected and implemented.

## Brand Commitments

- Preserve the name **Look Optica** and the existing logo and brand assets in `frontend/public/` unless the user explicitly approves a rebrand.
- Preserve Greek-first customer communication and accurate physical-store information for the Chalandri location.
- Communicate value clearly while maintaining the authority and trust expected from expert optical guidance.
- Preserve the nationwide e-commerce scope and accurately distinguish it from services limited to Attica.

## Evidence on Hand

- The repository contains the working customer storefront, administration interface, backend APIs, database models and migrations, checkout and payment integrations, and product imagery.
- Existing brand and campaign assets are stored in `frontend/public/`, including `logo.png`, product imagery, category imagery, and promotional assets.
- Current business contact details, store hours, location, and service descriptions are present in the customer-facing pages.
- `dpia-lite.md` documents current and planned personal-data flows, security measures, third-party processors, and unresolved retention/privacy work.
- No testimonials, customer counts, comparative savings claims, performance benchmarks, awards, or press evidence have been confirmed. Future work must not fabricate them.

## Product Principles

1. Make strong value visible without compromising trust or professional optical guidance.
2. Help customers choose confidently through clear product information and accessible expert support.
3. Serve customers consistently across Greece while labeling local-only services precisely.
4. Keep customer communication adaptable so future messaging channels can be added responsibly.
5. Protect personal, account, and transaction data throughout customer and staff workflows.

## Accessibility & Inclusion

Accessibility is a product commitment, especially because the catalog and services include customers with low vision or limited mobility. Customer journeys should support keyboard use, screen readers, clear focus states, sufficient contrast, scalable text, understandable Greek copy, and responsive layouts. The at-home service must remain clearly discoverable for customers who cannot easily visit the physical shop.
