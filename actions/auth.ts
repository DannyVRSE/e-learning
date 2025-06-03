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
};

//instructor signup
export async function instructorSignUp(formData: FormData) {
    const supabase = await createClient();

    //👇🏻 get user credentials from the form
    const credentials = {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
        interest: formData.get("interest") as string,
        name: formData.get("name") as string,
        occupation: formData.get("occupation") as string,
        bio: formData.get("bio") as string,
        url: formData.get("url") as string,
        image: formData.get("image") as File,
    };

    //upload image and get the public URL
    const { data: imageData, error: imageError } = await supabase.storage
        .from("headshots")
        .upload(`${crypto.randomUUID()}/image`, credentials.image);

    if (imageError) {
        return { error: imageError.message, status: 500, user: null };
    }
    //👇🏻 get the image URL
    const imageURL = `${process.env.STORAGE_URL!}${imageData.fullPath}`;

    //👇🏻 authenticate user as instructor
    const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
            data: {
                interest: credentials.interest,
                name: credentials.name,
                occupation: credentials.occupation,
                bio: credentials.bio,
                url: credentials.url,
                image: imageURL,
            },
        },
    });

    //👇🏻 return user or error object
    if (error) {
        return { error: error.message, status: error.status, user: null };
    }

    revalidatePath("/", "layout");
    return { error: null, status: 200, user: data.user };
};

//instructor login
export async function instructorLogIn(formData: FormData) {
    const supabase = await createClient();

    const credentials = {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
    };

    const { data, error } = await supabase.auth.signInWithPassword(credentials);

    if (error) {
        return { error: error.message, status: error.status, user: null };
    }
    if (data?.user?.identities?.length === 0) {
        return { error: "User not found", status: 404, user: null };
    }
    if (data && !data.user.user_metadata.image) {
        return { error: "You are not an instructor", status: 400, user: null };
    }

    const { data: existingUser } = await supabase
        .from("instructors")
        .select()
        .eq("email", credentials.email)
        .single();
    if (!existingUser) {
        const { error: insertError } = await supabase.from("instructors").insert({
            email: credentials.email,
            name: data.user.user_metadata.name,
            occupation: data.user.user_metadata.occupation,
            bio: data.user.user_metadata.bio,
            url: data.user.user_metadata.url,
            image: data.user.user_metadata.image,
            id: data.user.id,
            interest: data.user.user_metadata.interest,
            followers: [],
        });

        if (insertError) {
            return { error: insertError.message, status: 500, user: null };
        }
    }

    revalidatePath("/", "layout");
    return { error: null, status: 200, user: data.user };
}
