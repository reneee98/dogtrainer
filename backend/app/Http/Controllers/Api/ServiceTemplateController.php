<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ServiceTemplate;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class ServiceTemplateController extends Controller
{
    /**
     * Display a listing of the user's service templates.
     */
    public function index(Request $request): JsonResponse
    {
        $templates = ServiceTemplate::where('user_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $templates,
        ]);
    }

    /**
     * Store a newly created service template.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'color' => 'required|string|max:50',
            'duration' => 'required|numeric|min:0.5|max:8',
            'price' => 'required|numeric|min:0',
            'description' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors(),
            ], 422);
        }

        $template = ServiceTemplate::create([
            'user_id' => $request->user()->id,
            'name' => $request->name,
            'color' => $request->color,
            'duration' => $request->duration,
            'price' => $request->price,
            'description' => $request->description,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Service template created successfully',
            'data' => $template,
        ], 201);
    }

    /**
     * Display the specified service template.
     */
    public function show(Request $request, ServiceTemplate $serviceTemplate): JsonResponse
    {
        // Check if the template belongs to the authenticated user
        if ($serviceTemplate->user_id !== $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $serviceTemplate,
        ]);
    }

    /**
     * Update the specified service template.
     */
    public function update(Request $request, ServiceTemplate $serviceTemplate): JsonResponse
    {
        // Check if the template belongs to the authenticated user
        if ($serviceTemplate->user_id !== $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'color' => 'required|string|max:50',
            'duration' => 'required|numeric|min:0.5|max:8',
            'price' => 'required|numeric|min:0',
            'description' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors(),
            ], 422);
        }

        $serviceTemplate->update($request->only([
            'name', 'color', 'duration', 'price', 'description'
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Service template updated successfully',
            'data' => $serviceTemplate,
        ]);
    }

    /**
     * Remove the specified service template.
     */
    public function destroy(Request $request, ServiceTemplate $serviceTemplate): JsonResponse
    {
        // Check if the template belongs to the authenticated user
        if ($serviceTemplate->user_id !== $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        $serviceTemplate->delete();

        return response()->json([
            'success' => true,
            'message' => 'Service template deleted successfully',
        ]);
    }
}
