# Terms of Service & Moderation Policy — Draft Structure
**⚠️ This is a structural draft for a lawyer to review and finalize, not finished legal advice. Do not launch on this text alone.**

Jurisdiction assumed: India (primary), with notes on FOSTA-SESTA/US exposure if you ever accept international users.

---

## PART A: TERMS OF SERVICE

1. **Eligibility**
   - Users must be 18+ (state explicitly; India's Information Technology Act and POCSO Act make this non-negotiable for any platform facilitating adult connections)
   - Users must complete identity/age verification before unlocking matching/messaging
   - Right to refuse service to anyone who fails verification or misrepresents age

2. **Account & Conduct Rules**
   - Prohibited: impersonation, soliciting payment for sexual services (this crosses into facilitating commercial sex work, which is illegal under India's Immoral Traffic (Prevention) Act, 1956), harassment, sharing others' private content without consent, posting contact info to bypass the platform, underage content, hate speech, scams/catfishing

3. **Content Ownership & License**
   - Users retain ownership of uploaded photos/bio; grant platform a license to display/process (including for moderation scanning)

4. **Platform Rights**
   - Right to suspend/ban accounts, remove content, and report illegal activity to law enforcement (e.g. cybercrime cells, NCMEC equivalent in India: report to local police / National Cyber Crime Reporting Portal at cybercrime.gov.in)

5. **Limitation of Liability**
   - Platform is not liable for user conduct off-platform (meetups, etc.) — must include a clear safety disclaimer and meeting-safety guidance (public first meeting, tell a friend, video-verify before meeting)

6. **Data & Privacy**
   - Cross-reference with your Privacy Policy (separate document) — required under India's Digital Personal Data Protection Act, 2023 (DPDPA)
   - Sensitive data categories (sexual orientation, location, biometric-ish photo data) need explicit consent language

7. **Grievance Redressal** *(legally mandatory under IT Rules 2021)*
   - Must name a **Grievance Officer** (real person, published name + contact)
   - Must name a **Nodal Officer** and **Chief Compliance Officer** if you cross user thresholds defined for "significant social media intermediaries" (currently 50 lakh+ registered users in India)
   - Acknowledge complaints within 24 hours; resolve within 15 days
   - Special fast-track (within 24 hrs of complaint) for content depicting nudity, sexual acts, or impersonation, per Rule 3(2)(b)

8. **Termination**
   - Grounds for immediate termination (underage signup, trafficking-related content/solicitation, repeated harassment reports)

9. **Governing Law**
   - Specify Indian courts/jurisdiction (e.g. courts of [your city])

---

## PART B: CONTENT MODERATION POLICY (internal + published summary)

1. **Pre-publication photo screening**
   - All photos pass automated CSAM hash-matching (PhotoDNA or similar) BEFORE going live
   - Nudity/explicit-content classifier (AWS Rekognition, Hive Moderation, or similar) flags for human review
   - Mandatory legal duty: any CSAM detected must be reported, not just removed — in India to the National Cyber Crime Reporting Portal and police; in the US (if applicable) to NCMEC under 18 U.S.C. §2258A

2. **Message monitoring**
   - Automated keyword/ML flagging for: trafficking language, solicitation of payment for sex, threats, underage indicators
   - Flagged messages go to a human moderation queue — never auto-delete without review, to preserve evidence trails for law enforcement referrals

3. **User reporting pipeline**
   - Categories: harassment, fake profile, underage, explicit content, scam, other
   - "Underage" and "explicit content" reports get priority/immediate review
   - Define SLA: e.g. priority reports reviewed within 4 hours, standard within 48 hours

4. **Escalation to law enforcement**
   - Define exact triggers (confirmed CSAM, confirmed trafficking solicitation, credible threat of violence) and exact reporting channel (cybercrime.gov.in, local police cybercrime cell, NCMEC if US nexus)
   - Keep an internal audit log of all escalations (the `audit_log` and `reports` tables in the schema support this)

5. **Appeals process**
   - Users banned/suspended can appeal once; define review process and timeline

6. **Transparency reporting** (recommended, not always mandatory)
   - Periodic public report: number of accounts removed, reports received/resolved — builds trust and is increasingly expected under global "online safety" norms

---

## PART C: SAFETY-BY-DESIGN FEATURES TO BUILD (beyond what's in the starter code)

- In-app "video verify before meeting" prompt
- Optional location-sharing with a trusted contact for in-person meetups
- Panic/check-in feature for dates
- Clear, persistent in-app safety tips (meet in public, don't share financial info, etc.)

---

## Next steps before launch
1. Have an Indian lawyer specializing in IT/internet law review and finalize this into binding ToS + Privacy Policy
2. Register your Grievance Officer's details and publish them on the site (mandatory)
3. Set up a contract with an image-moderation API for CSAM hash-matching — do not launch without this
4. Confirm your DPDPA data-processing compliance (consent flows, data localization considerations, breach notification process)
