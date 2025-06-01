"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../utils/supabase/server";

export async function studentSignUp(formData: FormData) {
    const supabase = await createClient();

    //👇🏻 Extract form data
    const credentials = {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
        interest: formData.get("interest") as string,
        name: formData.get("name") as string,
    };

    //👇🏻 Supabase sign up function (options attribute :- for user metadata)
    const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
            data: {
                interest: credentials.interest,
                name: credentials.name,
            },
        },
    });

    //👉🏻 return user or error object
    if (error) {
        return { error: error.message, status: error.status, user: null };
    } else if (data.user?.identities?.length === 0) {
        return { error: "User already exists", status: 409, user: null };
    }

    revalidatePath("/", "layout");
    return { error: null, status: 200, user: data.user };
};

//login function
export async function studentLogIn(formData: FormData) {
    const supabase = await createClient();

    const credentials = {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
    };
    const { data, error } = await supabase.auth.signInWithPassword(credentials);

    if (error) {
        return { error: error.message, status: error.status, user: null };
    }
    //👇🏻 only instructors have an image attribute
    if (data && data.user.user_metadata.image) {
        return { error: "You are not a student", status: 400, user: null };
    }

    //👉🏻 create a student row and add to the database
    const { data: existingUser } = await supabase
        .from("students")
        .select()
        .eq("email", credentials.email)
        .single();

    //👇🏻 if student doesn't exist
    if (!existingUser) {
        const { error: insertError } = await supabase.from("students").insert({
            email: credentials.email,
            name: data.user.user_metadata.name,
            interest: data.user.user_metadata.interest,
            id: data.user.id,
            following_list: [] as string[],
        });

        if (insertError) {
            return { error: insertError.message, status: 500, user: null };
        }
    }

    revalidatePath("/", "layout");
    return { error: null, status: 200, user: data.user };
}
