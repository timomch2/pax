import { createHash } from 'node:crypto';

export const VAULT_NDA_SLUG = 'vault-mutual-nda';
export const VAULT_NDA_VERSION = 1;
export const VAULT_NDA_TITLE = 'Digital Mutual Non-Disclosure Agreement';
export const VAULT_NDA_BODY = `IMPORTANT NOTICE

By accepting this agreement or accessing Tier 2 materials in the Praxis Exchange (PAX) Innovation Vault, the registered recipient enters into a binding confidentiality agreement with the verified owner or institutional rights-holder of the innovation (the Disclosing Party).

1. PARTIES AND ELECTRONIC RECORD
The Disclosing Party is the verified owner of the Innovation ID identified in the acceptance record. The Receiving Party is the authenticated PAX member named in that record. PAX records the template version and hash, Innovation ID, account identity, timestamp, IP address and user agent as evidence of assent.

2. CONFIDENTIAL INFORMATION
Confidential Information includes non-public source code, technical designs, algorithms, engineering materials, clinical or field-validation data, financial models, pricing strategy, capitalization information, unfiled patent material, trade-secret descriptions and other assets designated as Tier 2.

3. EXCLUSIONS
Confidential Information excludes information that becomes public without breach, was lawfully possessed before disclosure and can be evidenced in writing, is independently developed without use of the disclosed material, or must be disclosed by law after prompt notice where legally permitted.

4. PERMITTED PURPOSE AND DUTIES
The Receiving Party may use the information only to evaluate a potential investment, licence, joint venture or acquisition. The Receiving Party must protect it with at least reasonable care and must not copy, distribute, reverse engineer, decompile, modify, commercialize or circumvent the Disclosing Party without separate written authorization.

5. INTELLECTUAL PROPERTY
No licence, title or ownership interest transfers under this agreement. PAX timestamps and access records are evidence records only and do not constitute legal certification of ownership or validity.

6. TERM
The evaluation obligations apply for two years after acceptance. Trade secrets remain confidential until they lawfully enter the public domain.

7. REMEDIES
Unauthorized use or disclosure may cause irreparable harm. The Disclosing Party may seek injunctive relief, damages and any other remedy available under applicable law.

8. GOVERNING LAW
The agreement is governed by the jurisdiction identified by the Disclosing Party, defaulting to Kenya when none is identified. Disputes are subject to the dispute-resolution rules stated in the parties' applicable written arrangements and mandatory law.

9. ELECTRONIC ASSENT
By checking the assent box, typing their name and selecting Accept, the Receiving Party confirms authority to bind themselves or their entity, confirms they have read and understood this exact version, and adopts the action as an electronic signature.`;

export function vaultNdaHash(body = VAULT_NDA_BODY): string {
  return createHash('sha256').update(body, 'utf8').digest('hex');
}
