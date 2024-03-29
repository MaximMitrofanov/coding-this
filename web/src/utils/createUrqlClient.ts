import { dedupExchange, Exchange, fetchExchange, gql, ssrExchange, stringifyVariables } from 'urql';
import { pipe, tap } from "wonka";
import { cacheExchange, Resolver, Cache } from '@urql/exchange-graphcache';
import { LogoutMutation, CheckMeQuery, CheckMeDocument, LoginMutation, RegisterMutation, UpvoteMutationVariables } from '../generated/graphql';
import { betterUpdateQuery } from './betterUpdateQuery';
import Router from "next/router";
import { isServer } from "./isServer";


const errorExchange: Exchange = ({ forward }) => (ops$) => {
  return pipe(
    forward(ops$),
    tap(({ error }) => {
      if (error?.message.includes("not authenticated")) {
        Router.replace("/login");
      }
    })
  );
};

const invalidateAllPosts = (cache: Cache) => {
  const allFields = cache.inspectFields("Query");
  const fieldInfos = allFields.filter((info) => info.fieldName === "posts");
  fieldInfos.forEach((fi) => {
    cache.invalidate("Query", "posts", fi.arguments || {});
  });
}


let page: any;
let orderby: any;
const cursorPagination = (): Resolver => {
  return (_parent, fieldArgs, cache, info) => {
    const { parentKey: entityKey, fieldName } = info;
    const allFields = cache.inspectFields(entityKey);
    const fieldInfos = allFields.filter((info) => info.fieldName === fieldName);
    const size = fieldInfos.length;
    if (size === 0) {
      return undefined;
    }
    const fieldKey = `${fieldName}(${stringifyVariables(fieldArgs)})`;
    const isItInTheCache = cache.resolve(
      cache.resolve(entityKey, fieldKey) as string,
      "posts"
    );
    info.partial = !isItInTheCache;
    let hasMore = true;
    const results: string[] = [];

    // Check if page changed
    if (
      fieldInfos[fieldInfos.length - 1]?.arguments?.page !== page
      || fieldInfos[fieldInfos.length - 1]?.arguments?.orderby !== orderby
    ) {
      // If it did insert the newest data
      page = fieldInfos[fieldInfos.length - 1]?.arguments?.page;
      orderby = fieldInfos[fieldInfos.length - 1]?.arguments?.orderby;
      const key = cache.resolve(entityKey, fieldInfos[fieldInfos.length - 1].fieldKey) as string;
      const data = cache.resolve(key, "posts") as string[];
      const _hasMore = cache.resolve(key, "hasMore");
      if (!_hasMore) {
        hasMore = _hasMore as boolean;
      }
      results.push(...data);

      // Loops through the cache and invalidates all the previous cache
      for (let i = 0; i < fieldInfos.length - 1; i++) {
        cache.invalidate("Query", "posts", fieldInfos[i].arguments || {});
      }
    } else {
      // Else add the new data to the existing data
      fieldInfos.forEach((fi) => {
        const key = cache.resolve(entityKey, fi.fieldKey) as string;
        const data = cache.resolve(key, "posts") as string[];
        const _hasMore = cache.resolve(key, "hasMore");
        if (!_hasMore) {
          hasMore = _hasMore as boolean;
        }
        results.push(...data);
      });
    }


    return {
      __typename: "PaginatedPosts",
      hasMore,
      posts: results,
    };
  };
};



export const createUrqlClient = (ssrExchange: any, ctx: any) => {
  let cookie = "";
  if (isServer()) {
    cookie = ctx?.req?.headers?.cookie;
  }

  return {
    url: 'http://localhost:4000/graphql',
    fetchOptions: {
      credentials: 'include' as const,
      headers: cookie
        ? {
          cookie,
        }
        : undefined,
    },
    exchanges: [dedupExchange, cacheExchange({
      keys: {
        PaginatedPosts: () => null,
        descriptionSnippet: () => null,
      },
      resolvers: {
        Query: {
          posts: cursorPagination(),
        },
      },
      updates: {
        Mutation: {
          upvote: (_result, args, cache, info) => {
            const { postId } = args as UpvoteMutationVariables;
            const data = cache.readFragment(
              gql`
                fragment _ on Post{
                  id
                  likes
                  voteStatus
                }
              `,
              { id: postId } as any
            );
            let newLikes = data.likes as number;
            let voteStatus = 0;
            if (data.voteStatus) {
              --newLikes;
            } else {
              ++newLikes;
              voteStatus = 1;
            }
            cache.writeFragment(
              gql`
                  fragment __ on Post{
                    likes
                    voteStatus
                  }
                `,
              { id: postId, likes: newLikes, voteStatus } as any
            )
          },
          star: (_result, args, cache, info) => {
            const { postId } = args as UpvoteMutationVariables;
            const data = cache.readFragment(
              gql`
                fragment _ on Post{
                  id
                  starStatus
                }
              `,
              { id: postId } as any
            );
            let starStatus = 0;
            if (!data.starStatus) {
              starStatus = 1;
            }
            cache.writeFragment(
              gql`
                  fragment __ on Post{
                    starStatus
                  }
                `,
              { id: postId, starStatus } as any
            )
          },
          createPost: (_result, args, cache, info) => {
            invalidateAllPosts(cache);
          },
          logout: (_result, args, cache, info) => {
            betterUpdateQuery<LogoutMutation, CheckMeQuery>(
              cache,
              { query: CheckMeDocument },
              _result,
              () => ({ checkMe: null })
            );
            invalidateAllPosts(cache);
          },
          login: (_result, args, cache, info) => {
            betterUpdateQuery<LoginMutation, CheckMeQuery>(
              cache,
              { query: CheckMeDocument },
              _result,
              (result, query) => {
                if (result.login.errors) {
                  return query
                } else {
                  return {
                    checkMe: result.login.user,
                  }
                }
              }
            );
            invalidateAllPosts(cache);

          },
          register: (_result, args, cache, info) => {
            betterUpdateQuery<RegisterMutation, CheckMeQuery>(
              cache,
              { query: CheckMeDocument },
              _result,
              (result, query) => {
                if (result.register.errors) {
                  return query
                } else {
                  return {
                    checkMe: result.register.user,
                  }
                }
              }
            );
            invalidateAllPosts(cache);
          },
        },
      },
    }),
      errorExchange,
      ssrExchange,
      fetchExchange
    ],
  }
}