# What we need from the owner

None of these block the demo. All of them block launch.

## Business facts
1. **Hours, by day.** Our default is 6 AM to midnight every day. A third-party listing shows Mon 6a-10p, Tue-Fri 6a-12a, Sat 7a-12a, Sun 7a-10p. (`data/business.ts` -> `hours`)
2. **Sales tax.** We use Erie County 8.75% on everything (Clover shows one tax rate for all items). Confirm with the accountant.
3. **Events.** Public reporting lists Wednesday Night Live (every other Wednesday, 9-11 PM) and 2-5 music/literary events a week. Where should the calendar come from: Instagram (`@the_caffe_elmwood`), a Google Calendar, or a simple list we update?
4. **Alcohol rules.** Can alcohol be sold for pickup, or only served in the cafe? We default to **for here only** with a 21+ ID acknowledgment. What does their liquor license allow?
5. **The hidden bar.** Clover has empty categories for *Wine by glass, Cocktails, Spritzez, Digestivi*. Which items and prices belong there so they can be ordered?
6. **Spirits.** Rum, Tequila, Gin, Bourbon, Irish Whiskey, Vodka are `$0` buttons in Clover. Should they become a "spike it" add-in on coffee drinks, and at what price?

## The storefront and the info on the site
The hero is a stylized 3D version of the building: a two-storey brick corner building where Elmwood meets Bidwell, front door in the chamfered corner, patio seating on both streets, attached to Talking Leaves Books. It is modelled on a 3D sketch of the building and public descriptions, not on measured drawings, so please check:
7. **Does it look like your building?** Awning colour and wording, the corner door (double glass doors?), how many windows and bays each street has, the patio layout and how many tables you really put out on each side, window signs. A few photos of the corner (day and night) would let us match it exactly.
8. **Wi-Fi.** A third-party listing says free Wi-Fi. True? (Shown on the site as "Wi-Fi"; `data/business.ts` -> `amenities`.)
9. **Parking and accessibility.** We say nothing about parking, a ramp or step-free entry because we do not know. What should visitors be told?
10. **Patio season.** Year-round or weather permitting? Any dog policy?
11. **Event schedule.** The golden-hour chapter and the Tonight section send people to your Instagram for the week's lineup. Would you rather we show a simple weekly calendar you update (or sync it from Google Calendar)?
12. **Hours board.** The facade sign and the hero say "every day, 6 AM - 12 AM" (see question 1).

## Menu review (our wording needs a yes)
- 64 items normalized from Clover; the full list of changes is in `data/menu.json` -> `review[]` (33 notes). Highlights:
  - "Espresso" is listed as a standalone drink priced from Clover's size options (Single $2.95 / Doppio $3.50). Clover only has "extra Espresso".
  - Frittata & Coffee Mimosa is treated as alcohol (21+) until confirmed.
  - Orange flavor had no price in Clover; we priced it +$0.75 like the others.
  - "Modelito" spelling and the odd beer prices ($5.52, $6.94): are these tax-inclusive?
  - Names and stories we kept: "Rose London Fog" (Clover: "Lucy Dacus Rose London Fog"), Amy's baked goods, Biscotti for Everybotti.
- Every description is marked `draftedByUs: true` until approved.

## Brand and content
- A **vector logo** (we re-drew the mark in CSS from a 240px JPG; their original is better).
- **Photography.** We deliberately did not scrape Google photos. A short photo session of the room and drinks is the best next upgrade.
- OK to show the three Google review excerpts and the 4.5 / 718 rating? OK to name Jesse and Michaela Schmidbauer in the story?

## Going live
- Who owns the Clover merchant account? We need them to authorize the app (and for the checkout to use the Clover Ecommerce API) so payments settle in their account and orders print/appear on their POS.
- Domain: keep `caffearomabuffalo.com`? Who manages DNS?
- Preferred way to receive orders: Clover POS only, plus a counter tablet running `/staff`?
- Order notifications: SMS (Twilio) and/or email receipts?
