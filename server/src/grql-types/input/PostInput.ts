import { InputType, Field } from 'type-graphql';



@InputType()
export class PostInput {
    @Field()
    description: string;

    @Field()
    title: string;

    @Field(()=> [String], {nullable: true})
    tags: string[];
}
