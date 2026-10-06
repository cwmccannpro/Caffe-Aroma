# Caffe Aroma: audit and pitch notes

Use this to walk the owner through *why* a new site matters, then show the live demo.
Everything below was observed on the live sites on 2026-10-06. Items marked **re-check** came from an automated page summary and should be eyeballed in a browser before you put them on a slide.

## What the owner has today

### caffearomabuffalo.com
| Observation | Why it costs them |
|---|---|
| It is an unmodified **ThemeREX WordPress template** ("Deliciosa", footer "ThemeREX © 2026"). **Re-check.** | Looks like every other template site; says nothing about a 30-year Elmwood institution. |
| Hours read **Mon-Fri 9-6, Sat 9-4, Sun closed**. **Re-check.** | The cafe is open until midnight. The site tells the whole evening and bar crowd (and every Sunday visitor) that it is closed. |
| Footer address is a **Berlin placeholder**, email is `info@email.com`, social icons point at the template maker's accounts. **Re-check.** | Broken trust signals and lost contact. |
| The only call to action is **"Book a table"** (a reservations page). | A coffee shop sells *orders*, not reservations. |
| No online ordering, no events, no mention of the bar. | The three things that make Aroma special are invisible. |

### Clover online ordering page
| Observation | Why it costs them |
|---|---|
| Says **"isn't accepting online orders right now"** whenever the cafe is closed. | No way to schedule for tomorrow's 6 AM coffee, which is the highest-intent order of the day. |
| Green Clover chrome, tiny logo, no brand. | Customers feel they left the cafe's site. The owner rents the customer relationship. |
| ~86 listings but messy: duplicate items across categories, typos ("Cherrt", "packetd"), recipes pasted into item names, ~18 items priced `$0.00` until a size is picked, liquor shots listed as $0 items. | Hard to browse on a phone, easy to mis-order. |
| **Wine by glass, cocktails, Spritzez and Digestivi categories exist but are empty online.** | The bar menu, the nighttime business, is not orderable at all. |
| **No item is flagged 21+**, not even the beer. | Compliance gap the new flow fixes (21+ tags, ID acknowledgment, for-here only). |

## What we built instead

| Capability | Where to see it |
|---|---|
| A 3D version of the corner building (brick, glass corner door, green awnings and patio seating on both Elmwood and Bidwell, an "open every day 6 AM - 12 AM" board over the door) that follows the real Buffalo time. Scroll and the camera glides to the corner door and through it to a window table where the day plays out: croissant at 6 AM, laptop at midday, live music at golden hour, neon-lit after dark, last call. Drag the clock to jump to any hour. | `/` |
| An "at a glance" strip with live open/closed status, hours, address and directions, phone, order-ahead and amenities, plus a live-music schedule block and an hours table that marks today. | `/#info`, `/#tonight`, `/#visit` |
| Their real menu (all 64 orderable items, real prices, real sizes/milks/flavors) in their own brand. Menu order follows the time of day (espresso first at 8 AM, the bar first at 9 PM). | `/order` |
| A live 3D drink preview that changes with size, milk, flavor, whipped cream, ice. | item sheet on `/order` |
| Schedule-ahead pickup in 15-minute slots, even when closed. Per-slot capacity. Tips, tax, promo code, upsell, ID check for alcohol. | `/order/checkout` |
| Apple Pay / Google Pay style sheet and card form (simulated). | checkout, step "Payment" |
| Live order tracker the customer can keep open. | `/order/track/...` |
| A counter board for the staff: new / making / ready, chime on new orders, "86" a sold-out item, pause online ordering. | `/staff` (PIN `1995`) |
| Local SEO: schema.org markup for the cafe, hours, rating, menu and pickup action. | page source |

## The 90-second demo script
1. Open `/`: you are standing in the intersection facing the cafe's corner, with patio seating on both streets and the hours on the board over the door. Scroll once and the camera glides to the open corner door ("Come on in"), scroll again and you are at the window table at 6 AM with a steaming cup and a croissant. Keep scrolling: midday laptop, 6 PM guitar and mic with a "Check the schedule" button, then after dark and last call. Dragging the clock to **6 PM** at any point turns the sky peach and warms the neon sign.
2. Tap **Order ahead**. Point out how the menu leads with cocktails and beer after dark.
3. Open **Cappuccino**: choose oat milk and vanilla, watch the 3D cup change color. Add a biscotti from the upsell.
4. **Checkout**: name + phone, pick a time (note ASAP is disabled when closed, and scheduling still works), 15% tip, **Apple Pay** sheet.
5. On the tracker, show "We've got your order".
6. Open **/staff** in a second window: the order is already there with a chime. Tap **Start making**, then **Mark ready**, and flip back to the tracker: it says **It's ready!**.
7. Add a beer to a cart to show the **21+ / for here only / CHECK ID** behavior.

## Honest limits to say out loud
- Checkout is a **demo**: no card is charged. The payment layer sits behind one interface so the Clover adapter drops in after approval; card payments would settle in their *existing* Clover merchant account and orders would land on their POS.
- Orders and the counter board currently live in the browser (they sync between windows on one device). A live server (Clover orders API or Supabase) is the production step so a phone order appears on the counter screen.
- Descriptions are drafts in our words (flagged `draftedByUs` in the menu data) and need the owner's approval.
