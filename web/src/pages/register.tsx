import React, { FC } from "react";
import { Formik, Form } from "formik";
import { Box, Button } from "@chakra-ui/react";
import { Wrapper } from "../components/Wrapper";
import { InputField } from "../components/InputField";
import { useRegisterMutation } from "../generated/graphql";
import { toErrorMap } from "../utils/toErrorMap";
import { useRouter } from "next/router";
import { createUrqlClient } from "../utils/createUrqlClient";
import { withUrqlClient } from "next-urql";

interface registerProps {}

const Register: FC<registerProps> = ({}) => {
  const router = useRouter();
  const [, register] = useRegisterMutation();

  return (
    <Wrapper variant="small">
      <Formik
        initialValues={{ email: "", displayname: "", password: "" }}
        onSubmit={async (values, { setErrors }) => {
          const response = await register({ options: values });
          if (response.data?.register.errors) {
            // If failed
            setErrors(toErrorMap(response.data.register.errors));
          } else if (response.data?.register.user) {
            // If success
            router.push("/");
          }
        }}
      >
        {({ isSubmitting }) => (
          <Form>
            <InputField
              name="displayname"
              label="Display Name"
              placeholder="Charlie"
              required
            />

            <Box mt={4}>
              <InputField
                name="email"
                label="Email"
                placeholder="Michael@email.com"
                type="email"
                required
              />
            </Box>

            <Box mt={4}>
              <InputField
                name="password"
                label="Password"
                placeholder="****"
                type="password"
                required={true}
              />
            </Box>

            <Button
              mt={4}
              type="submit"
              bg="blue.400"
              colorScheme="blue"
              color="white"
              isLoading={isSubmitting}
              loadingText="Signing Up"
            >
              Sign Up
            </Button>
          </Form>
        )}
      </Formik>
    </Wrapper>
  );
};

export default withUrqlClient(createUrqlClient)(Register);
