import {
  Table,
  TableBody,
  // TableCaption,
  TableCell,
  // TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/baseComponents/table";
import { useMembers } from "@/shared/hooks/useMembers";

export default function SystemTable() {
  const { members, loading, error } = useMembers();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <Table className="mt-8">
      {/* <TableCaption>A list of your recent invoices.</TableCaption> */}
      <TableHeader>
        <TableRow className="bg-primary-background">
          <TableHead className="w-[200px] text-right">קטגוריה</TableHead>
          <TableHead className="w-[200px] text-right">הודעה</TableHead>
          <TableHead className="w-[200px] text-center">סטטוס טיפול</TableHead>
          <TableHead className="w-[200px] text-center">אחראי טיפול</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {members.map((member) => (
          <TableRow key={member.id}>
            <TableCell className="font-medium">{member.email}</TableCell>
            <TableCell>{member.email}</TableCell>
            <TableCell>{member.email}</TableCell>
            <TableCell className="text-right">{member.email}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      {/* <TableFooter>
        <TableRow>
          <TableCell colSpan={3}>Total</TableCell>
          <TableCell className="text-right">$2,500.00</TableCell>
        </TableRow>
      </TableFooter> */}
    </Table>
  );
}
