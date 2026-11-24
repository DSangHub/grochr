import {timingSafeEqual} from 'node:crypto';
import {uber,doordash} from '../server/providers/delivery.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'POST required'});
 const key=process.env.DELIVERY_TEST_ADMIN_KEY;const supplied=req.headers.authorization||'';const expected='Bearer '+key;
 if(!key||supplied.length!==expected.length||!timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)))return res.status(401).json({error:'Unauthorized'});
 const x=req.body||{};
 if(!['pickupAddress','dropoffAddress','pickupPhone','dropoffPhone'].every(k=>typeof x[k]==='string'&&x[k].length>0&&x[k].length<=500)||!Number.isSafeInteger(x.orderValueCents)||x.orderValueCents<0)return res.status(400).json({error:'Valid addresses, phones and order value in cents required'});
 const providers=[['Uber Direct',uber],['DoorDash Drive',doordash]];
 const results=await Promise.all(providers.map(async([provider,p])=>{if(!p.configured())return {provider,status:'not_configured'};try{return {...await p.quote(x),status:'quoted'};}catch{return {provider,status:'unavailable'};}}));
 return res.status(200).json({results,instacart:{status:'retailer_workflow_required'}});
}
