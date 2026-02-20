import requests
import io

B = 'http://localhost:8000'

# 1. Create wallet
w = requests.post(B+'/wallet/create').json()
print('Wallet:', w['address'][:12])

# 2. Submit evidence (backend expects: FINANCIAL, CONSTRUCTION, FOOD, ACADEMIC)
files = [('files', ('report.pdf', io.BytesIO(b'Evidence data content for testing'), 'application/pdf'))]
sub = requests.post(B+'/evidence/submit', data={
    'category': 'FINANCIAL',
    'organization': 'Acme Corp',
    'description': 'Fraudulent accounting practices discovered in Q3 reports',
    'wallet_mnemonic': w['mnemonic'],
    'stake_amount': '50'
}, files=files).json()
print('Submit response:', sub)
eid = sub['evidence_id']
print('Evidence:', eid)

# 3. Register inspectors
inspectors = []
for i in range(3):
    iw = requests.post(B+'/wallet/create').json()
    r = requests.post(B+'/verification/register-inspector', json={
        'address': iw['address'],
        'name': 'Inspector_' + str(i+1),
        'specializations': ['FINANCIAL']
    })
    print('Register inspector', i+1, ':', r.status_code)
    inspectors.append(iw)

# 4. Begin verification (needs evidence_id + category)
r = requests.post(B+'/verification/begin', json={
    'evidence_id': eid,
    'category': 'FINANCIAL'
})
print('Begin verification:', r.status_code, r.text[:200])

# 5. Commit phase (generate-commit uses verdict + nonce)
nonces = []
for i, iw in enumerate(inspectors):
    nonce = 'secret_' + str(i)
    h = requests.post(B+'/verification/generate-commit', json={
        'verdict': 1, 'nonce': nonce
    }).json()
    print('GenerateCommit', i+1, ':', h.get('commit_hash', 'ERROR')[:16])
    nonces.append(nonce)
    r = requests.post(B+'/verification/commit', json={
        'evidence_id': eid,
        'inspector_address': iw['address'],
        'commit_hash': h['commit_hash']
    })
    print('Commit', i+1, ':', r.status_code)

# 6. Advance to reveal (query param)
r = requests.post(B+'/verification/advance-to-reveal', params={'evidence_id': eid})
print('Advance to reveal:', r.status_code, r.text[:100])

# 7. Reveal (needs verdict, nonce, justification_ipfs)
for i, iw in enumerate(inspectors):
    r = requests.post(B+'/verification/reveal', json={
        'evidence_id': eid,
        'inspector_address': iw['address'],
        'verdict': 1,
        'nonce': nonces[i],
        'justification_ipfs': 'QmTestJustification' + str(i)
    })
    print('Reveal', i+1, ':', r.status_code, r.text[:100])

# 8. Finalize (query param)
r = requests.post(B+'/verification/finalize', params={'evidence_id': eid})
print('Finalize:', r.status_code, r.text[:200])

# 9. Resolve (query param)
r = requests.post(B+'/resolution/resolve', params={'evidence_id': eid})
print('Resolve:', r.status_code, r.text[:200])

# 10. Bounty
r = requests.post(B+'/bounty/process/' + eid)
print('Bounty:', r.status_code, r.text[:200])

# 11. Publish (query param)
r = requests.post(B+'/audit/publish', params={'evidence_id': eid})
print('Audit publish:', r.status_code, r.text[:200])
r = requests.post(B+'/publication/publish/' + eid)
print('Publication:', r.status_code, r.text[:200])

# Submit more for variety
for cat in ['CONSTRUCTION', 'FOOD', 'ACADEMIC']:
    w2 = requests.post(B+'/wallet/create').json()
    files2 = [('files', ('doc.txt', io.BytesIO(b'Test document'), 'text/plain'))]
    r = requests.post(B+'/evidence/submit', data={
        'category': cat,
        'organization': cat.title() + ' Organization',
        'description': 'Evidence of ' + cat.lower() + ' irregularities detected',
        'wallet_mnemonic': w2['mnemonic'],
        'stake_amount': '0'
    }, files=files2)
    print('Extra', cat, ':', r.status_code)

# Stats
print('\n=== Final State ===')
try:
    print('Submissions:', len(requests.get(B+'/submissions/all').json()))
except: print('Submissions: error')
try:
    print('Sessions:', len(requests.get(B+'/verification/sessions').json()))
except: print('Sessions: error')
try:
    print('Resolutions:', len(requests.get(B+'/resolution/all/list').json()))
except: print('Resolutions: error')
try:
    print('Audit records:', len(requests.get(B+'/audit/records').json()))
except: print('Audit: error')
try:
    print('Bounty payouts:', len(requests.get(B+'/bounty/payouts').json()))
except: print('Bounty: error')
try:
    print('Publications:', len(requests.get(B+'/publication/records/all').json()))
except: print('Publications: error')
