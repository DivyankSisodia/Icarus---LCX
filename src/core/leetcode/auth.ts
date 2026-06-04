import { graphqlQuery } from "./graphql";
import type { LeetCodeViewer } from "../../types/problem";

const GLOBAL_DATA_QUERY = `
  query globalData {
    userStatus {
      userId
      username
      realName
      avatar
      isSignedIn
    }
  }
`;

const USER_PROFILE_QUERY = `
  query userPublicProfile($username: String!) {
    matchedUser(username: $username) {
      username
      profile {
        ranking
        realName
        userAvatar
        reputation
      }
      submitStats {
        acSubmissionNum {
          difficulty
          count
        }
      }
    }
  }
`;

export async function getViewer(): Promise<LeetCodeViewer> {
  try {
    const globalData = await graphqlQuery<{
      userStatus: {
        userId: number;
        username: string;
        realName: string;
        avatar: string;
        isSignedIn: boolean;
      };
    }>(GLOBAL_DATA_QUERY);

    if (!globalData.userStatus || !globalData.userStatus.isSignedIn) {
      throw new Error("Not signed in. Session may be invalid.");
    }

    const username = globalData.userStatus.username;

    let solvedCount = 0;
    let ranking = 0;

    try {
      const profileData = await graphqlQuery<{
        matchedUser?: {
          username: string;
          profile: { ranking: number; realName: string; userAvatar: string };
          submitStats: {
            acSubmissionNum: { difficulty: string; count: number }[];
          };
        };
      }>(USER_PROFILE_QUERY, { username });

      const matchedUser = profileData.matchedUser;
      if (matchedUser) {
        ranking = matchedUser.profile.ranking || 0;
        solvedCount =
          matchedUser.submitStats.acSubmissionNum.find(
            (s) => s.difficulty === "All"
          )?.count || 0;
      }
    } catch {
      // Profile stats are optional; auth is verified by globalData
    }

    return {
      username: globalData.userStatus.username,
      realName: globalData.userStatus.realName || "",
      avatar: globalData.userStatus.avatar || "",
      solvedCount,
      totalCount: 0,
      ranking,
    };
  } catch (error) {
    if (error instanceof Error) {
      const msg = error.message;
      if (msg.includes("Not authenticated") || msg.includes("session")) throw error;
      throw new Error(`Login verification failed: ${msg}`);
    }
    throw new Error("Failed to fetch user profile. Check your session credentials.");
  }
}
