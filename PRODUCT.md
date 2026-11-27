# LinkedOut

<!-- impeccable:product-schema 1 -->

## Platform
web

## Users and purpose
For the user browsing LinkedIn in Chrome and Safari: hide Premium upsells, including the “3 people viewed your profile” notification in the supplied screenshot.

## Brand commitments
LinkedOut is the confirmed name. The user requested a funny, sarcastic voice.

## Capabilities and constraints
Local DOM filtering on LinkedIn, including dynamically added notifications. Browser push filtering cannot reliably distinguish Premium marketing from other server-generated notifications. Chrome can optionally block all LinkedIn desktop notifications. Safari's website notification permission is managed manually. Browser extensions do not control LinkedIn's native mobile app or email notifications.

## Implementation assumptions
Use a shared Manifest V3 WebExtension with plain JavaScript and a small static settings popup. English sales copy is the initial matching scope, based on the supplied screenshot. Do not modify account settings, dismiss notifications on the server, or change unread counts.
