import AdminMemberDetail from '@/components/AdminMemberDetail';

export default async function AdminMemberPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  return <AdminMemberDetail userId={id}/>;
}
