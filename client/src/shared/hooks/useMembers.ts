// hooks/useMembers.ts

import { useEffect, useState } from "react";
import { useUser } from "../providers/UserProvider";
import axios from "axios";

export interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  // add more fields as needed
}

export function useMembers() {
  const { user } = useUser();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.company) return;

    const fetchMembers = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await axios.post(
          `https://nexus-online.net/_functions/companyMembers`,
          { company: user.company }
        );
        console.log({ res });
        setMembers(res.data.members);
      } catch (err: any) {
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [user?.company]);

  return { members, loading, error };
}
