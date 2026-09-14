import IndexDetailClient from '@/components/IndexDetailClient';
export default async function Page({params}:{params:Promise<{productId:string}>}){const {productId}=await params;return <IndexDetailClient productId={productId}/>}
