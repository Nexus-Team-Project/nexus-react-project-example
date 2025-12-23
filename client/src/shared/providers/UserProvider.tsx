import { createContext, useContext, useState } from "react";

// Shape of the user object
export interface User {
  id: string;
  name: string;
  email: string;
  company: string;
}

// Shape of what the context provides
export interface UserContextType {
  user: User | null;
  isLoading: boolean;
  error: boolean | null;
  // login?: (email: string, password: string) => Promise<void>;
  // logout?: () => void;
}

// 1. Create the Context
const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

function UserProvider({ children }: { children: React.ReactNode }) {
  // 3. The Provider Component
  const [user, setUser] = useState<User>({
    id: "123",
    name: "אדיר דיגמי",
    email: "test@gmail.com",
    company: "123456",
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  // const login = async (email, password) => {
  //   setIsLoading(true);
  //   setError(null);
  //   try {
  //     const userData = await mockLogin(email, password);
  //     setUser(userData);
  //     // In a real app, you would save the token here
  //   } catch (err) {
  //     setError(err.message);
  //     setUser(null);
  //     throw err; // Re-throw to allow the consuming component to handle the failure
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  // const logout = () => {
  //   // Clear token, reset state
  //   setUser(null);
  //   setIsLoading(false);
  //   setError(null);
  //   // Remove token from storage in a real app
  // };

  const value = {
    user,
    isLoading,
    error,
    //   login,
    //   logout,
  };

  // The provider wraps the child components, making 'value' available to them
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export default UserProvider;
