import type {Metadata} from 'next';
import AdminShell from '@/components/AdminShell';

export const metadata:Metadata={
  title:'BITMATE Admin Console',
  robots:{index:false,follow:false,nocache:true,googleBot:{index:false,follow:false,noimageindex:true}},
};

export default function AdminLayout({children}:{children:React.ReactNode}){
  return <AdminShell>{children}</AdminShell>;
}
