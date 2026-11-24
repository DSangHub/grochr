import {createHmac,randomUUID} from 'node:crypto';
const env=process.env;
const need=(...keys)=>keys.every(k=>Boolean(env[k]));
async function request(url,body,token,method='POST'){
 const r=await fetch(url,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw new Error('Provider HTTP '+r.status);
 return r.json();
}
let uberToken,expires=0;
async function uberAuth(){if(uberToken&&Date.now()<expires)return uberToken;
 const r=await fetch('https://auth.uber.com/oauth/v2/token',{method:'POST',body:new URLSearchParams({client_id:env.UBER_CLIENT_ID,client_secret:env.UBER_CLIENT_SECRET,grant_type:'client_credentials',scope:'eats.deliveries'}),signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw new Error('Uber authentication failed');const a=await r.json();uberToken=a.access_token;expires=Date.now()+(a.expires_in-60)*1000;return uberToken;}
const uberBase=()=> 'https://api.uber.com/v1/customers/'+encodeURIComponent(env.UBER_CUSTOMER_ID);
export const uber={configured:()=>need('UBER_CLIENT_ID','UBER_CLIENT_SECRET','UBER_CUSTOMER_ID'),quote:async x=>{const q=await request(uberBase()+'/delivery_quotes',{pickup_address:x.pickupAddress,dropoff_address:x.dropoffAddress},await uberAuth());return {provider:'Uber Direct',id:q.id,feeCents:q.fee,currency:q.currency,eta:q.dropoff_eta,expires:q.expires};},dispatch:async payload=>request(uberBase()+'/deliveries',payload,await uberAuth())};
function ddToken(){const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');const now=Math.floor(Date.now()/1000);const msg=enc({alg:'HS256',typ:'JWT','dd-ver':'DD-JWT-V1'})+'.'+enc({aud:'doordash',iss:env.DOORDASH_DEVELOPER_ID,kid:env.DOORDASH_KEY_ID,iat:now,exp:now+300});return msg+'.'+createHmac('sha256',Buffer.from(env.DOORDASH_SIGNING_SECRET,'base64url')).update(msg).digest('base64url');}
const dd='https://openapi.doordash.com/drive/v2';
export const doordash={configured:()=>need('DOORDASH_DEVELOPER_ID','DOORDASH_KEY_ID','DOORDASH_SIGNING_SECRET'),quote:async x=>{const q=await request(dd+'/quotes',{external_delivery_id:randomUUID(),pickup_address:x.pickupAddress,dropoff_address:x.dropoffAddress,pickup_phone_number:x.pickupPhone,dropoff_phone_number:x.dropoffPhone,order_value:x.orderValueCents},ddToken());return {provider:'DoorDash Drive',id:q.external_delivery_id,feeCents:q.fee,currency:q.currency,eta:q.dropoff_time_estimated};},dispatch:async(id,payload)=>request(dd+'/quotes/'+encodeURIComponent(id)+'/accept',payload,ddToken())};
// Instacart Connect has a retailer-specific service-options workflow, not a generic courier quote.
export const instacart={configured:()=>need('INSTACART_BASE_URL','INSTACART_ACCESS_TOKEN'),serviceOptions:async payload=>{const base=new URL(env.INSTACART_BASE_URL);if(base.protocol!=='https:')throw new Error('HTTPS required');return request(new URL('/v2/fulfillment/service_options',base).href,payload,env.INSTACART_ACCESS_TOKEN);}};
